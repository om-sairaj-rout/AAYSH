const { DELHIVERY_EDIT_PT } = require("./delhiveryEditShipmentOperationLogic");

/**
 * Maps Aaysh order payment labels to Delhivery edit API `pt`.
 * Staging-verified outbound values: COD | Prepaid (not Pre-paid).
 */
const normalizeDelhiveryPt = (paymentMethod) => {
  const pm = String(paymentMethod || "").trim().toUpperCase();
  if (pm === "COD") return DELHIVERY_EDIT_PT.COD;
  if (pm === "PREPAID") return DELHIVERY_EDIT_PT.PREPAID;
  if (pm === "PICKUP" || pm === "RVP") return "Pickup";
  if (pm === "REPL") return "REPL";
  return "";
};

const normalizeCourierStatusKey = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const FORWARD_EDITABLE = new Set([
  "manifested",
  "in transit",
  "pending",
]);

const RVP_EDITABLE = new Set(["scheduled"]);

const REPL_EDITABLE = new Set(["manifested", "in transit", "pending"]);

const NON_EDITABLE = new Set([
  "dispatched",
  "delivered",
  "dto",
  "rto",
  "lost",
  "closed",
  "cancelled",
  "canceled",
  "undelivered",
]);

const isPaymentConversionAllowed = (fromPt, toPt, codAmount) => {
  const from = normalizeDelhiveryPt(fromPt) || fromPt;
  const to = normalizeDelhiveryPt(toPt) || toPt;

  if (from === to) {
    return {
      ok: false,
      message: "Payment mode is unchanged. Remove payment mode from this edit.",
    };
  }

  const key = `${from}->${to}`;
  const allowed = {
    "COD->Prepaid": true,
    "Prepaid->COD": true,
  };

  if (!allowed[key]) {
    return {
      ok: false,
      message: `Payment mode conversion ${from} to ${to} is not allowed.`,
    };
  }

  if (key === "Prepaid->COD") {
    const amount = Number(codAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: "COD amount is required when converting Prepaid to COD.",
      };
    }
  }

  return { ok: true, conversion: key };
};

const resolveEditEligibility = ({
  delhiveryStatus,
  shipmentKind = "forward",
}) => {
  const key = normalizeCourierStatusKey(delhiveryStatus);
  if (!key) {
    return {
      editable: false,
      reason: "Delhivery shipment status could not be verified.",
    };
  }
  if (NON_EDITABLE.has(key)) {
    return {
      editable: false,
      reason: `Editing is not allowed when Delhivery status is "${delhiveryStatus}".`,
    };
  }

  const kind = String(shipmentKind || "forward").toLowerCase();
  let allowedSet = FORWARD_EDITABLE;
  if (kind === "rvp" || kind === "pickup") {
    allowedSet = RVP_EDITABLE;
  } else if (kind === "repl") {
    allowedSet = REPL_EDITABLE;
  }

  const editable = [...allowedSet].some(
    (allowed) => key === allowed || key.startsWith(`${allowed} `)
  );

  return {
    editable,
    reason: editable
      ? ""
      : `Delhivery status "${delhiveryStatus}" is not eligible for shipment edit.`,
    normalizedStatus: delhiveryStatus,
  };
};

const kgToGrams = (kg) => {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.round(n * 1000));
};

const normalizePhoneList = (primary, alternate) => {
  const phones = [];
  const add = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    const ten =
      digits.length === 10
        ? digits
        : digits.length >= 10
          ? digits.slice(-10)
          : "";
    if (ten && !phones.includes(ten)) phones.push(ten);
  };
  add(primary);
  add(alternate);
  return phones;
};

const buildEditPayloadDelta = ({
  order,
  changes = {},
  includePaymentChange = false,
}) => {
  const payload = {};
  const prev = {
    name: order.consigneeName,
    phone: order.billingPhone,
    address: [order.address, order.address2].filter(Boolean).join(", "),
    products_desc: null,
    weightKg: order.chargeableWeight || order.weight,
    length: order.length,
    breadth: order.breadth,
    height: order.height,
    paymentMethod: order.paymentMethod,
    cod: order.invoiceValue,
  };

  if (changes.name != null && String(changes.name).trim()) {
    const name = String(changes.name).trim();
    if (name !== String(prev.name || "").trim()) payload.name = name;
  }

  if (changes.phone != null || changes.alternatePhone != null) {
    const phones = normalizePhoneList(
      changes.phone != null ? changes.phone : prev.phone,
      changes.alternatePhone != null
        ? changes.alternatePhone
        : order.billingAlternatePhone
    );
    const prevPhones = normalizePhoneList(prev.phone, order.billingAlternatePhone);
    if (
      phones.length &&
      JSON.stringify(phones) !== JSON.stringify(prevPhones)
    ) {
      payload.phone = phones;
    }
  }

  if (changes.address != null) {
    const add = String(changes.address).trim();
    const prevAdd = String(prev.address || "").trim();
    if (add && add !== prevAdd) payload.add = add;
  }

  if (changes.products_desc != null) {
    const desc = String(changes.products_desc).trim();
    if (desc) payload.products_desc = desc.slice(0, 240);
  }

  if (changes.weightKg != null) {
    const grams = kgToGrams(changes.weightKg);
    const prevGrams = kgToGrams(prev.weightKg);
    if (grams && grams !== prevGrams) payload.gm = grams;
  }

  const dimMap = [
    ["shipment_length", "length", changes.length, prev.length],
    ["shipment_width", "breadth", changes.breadth ?? changes.width, prev.breadth],
    ["shipment_height", "height", changes.height, prev.height],
  ];

  for (const [apiKey, , newVal, oldVal] of dimMap) {
    if (newVal == null) continue;
    const n = Number(newVal);
    const o = Number(oldVal);
    if (Number.isFinite(n) && n > 0 && n !== o) {
      payload[apiKey] = n;
    }
  }

  if (includePaymentChange && changes.paymentMethod != null) {
    const ptCheck = isPaymentConversionAllowed(
      order.paymentMethod,
      changes.paymentMethod,
      changes.codAmount
    );
    if (!ptCheck.ok) {
      const err = new Error(ptCheck.message);
      err.code = "PAYMENT_CONVERSION_INVALID";
      throw err;
    }
    payload.pt = normalizeDelhiveryPt(changes.paymentMethod);
    if (payload.pt === "COD") {
      payload.cod = Number(changes.codAmount);
    }
  }

  return { payload, previous: prev };
};

const sanitizeEditResponseForAudit = (raw) => {
  if (raw === true || raw == null) return { ok: Boolean(raw) };
  if (typeof raw !== "object") {
    return { summary: String(raw).slice(0, 300) };
  }
  try {
    const clone = JSON.parse(JSON.stringify(raw));
    const scrub = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        if (/token|auth|password|secret/i.test(key)) {
          obj[key] = "[redacted]";
        } else if (typeof obj[key] === "object") {
          scrub(obj[key]);
        }
      }
    };
    scrub(clone);
    return clone;
  } catch {
    return { summary: "unparseable_response" };
  }
};

const isExplicitEditSuccess = (data) => {
  if (data === true) return true;
  if (!data || typeof data !== "object") return false;
  if (data.success === true || data.Success === true) return true;
  const status = String(data.status || data.Status || "").trim().toLowerCase();
  return status === "success" || status === "ok";
};

const isExplicitEditFailure = (data) => {
  if (typeof data === "string" && data.trim()) return true;
  if (!data || typeof data !== "object") return false;
  if (data.success === false || data.Success === false) return true;
  if (data.error || data.Error) return true;
  if (data.failure || data.Failure) return true;
  const status = String(data.status || data.Status || "").trim().toLowerCase();
  return ["failure", "fail", "error", "rejected"].includes(status);
};

const parseDelhiveryEditResponse = (response) => {
  const data = response?.data;
  const sanitized = sanitizeEditResponseForAudit(data);

  if (response?.status === 401 || response?.status === 403) {
    return {
      success: false,
      confirmed: true,
      error_code: "AUTH_ERROR",
      message: "Delhivery authentication failed.",
      raw: sanitized,
    };
  }
  if (response?.status >= 500) {
    return {
      success: false,
      uncertain: true,
      confirmed: false,
      error_code: "SERVER_ERROR",
      message: "Delhivery server error. Verify shipment before retrying.",
      raw: sanitized,
    };
  }

  if (response?.status >= 200 && response?.status < 300) {
    if (isExplicitEditSuccess(data)) {
      return { success: true, confirmed: true, raw: sanitized };
    }
    if (isExplicitEditFailure(data)) {
      return {
        success: false,
        confirmed: true,
        message:
          String(data?.error || data?.Error || data?.message || data) ||
          "Delhivery rejected the shipment edit.",
        raw: sanitized,
      };
    }
    return {
      success: false,
      uncertain: true,
      unconfirmed: true,
      confirmed: false,
      error_code: "UNCONFIRMED_RESPONSE",
      message:
        "Delhivery returned HTTP success without a confirmed edit outcome. Verify on Delhivery before retrying.",
      raw: sanitized,
    };
  }

  const message =
    (typeof data === "string" && data) ||
    data?.error ||
    data?.message ||
    data?.Error ||
    "Delhivery rejected the shipment edit request.";

  return {
    success: false,
    confirmed: true,
    message: String(message),
    raw: sanitized,
    http_status: response?.status,
  };
};

module.exports = {
  normalizeDelhiveryPt,
  isPaymentConversionAllowed,
  resolveEditEligibility,
  buildEditPayloadDelta,
  parseDelhiveryEditResponse,
  sanitizeEditResponseForAudit,
  isExplicitEditSuccess,
  isExplicitEditFailure,
  normalizePhoneList,
  kgToGrams,
  FORWARD_EDITABLE,
  NON_EDITABLE,
};
