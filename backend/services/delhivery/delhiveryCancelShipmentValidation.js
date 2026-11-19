const normalizeCourierStatusKey = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const FORWARD_CANCELABLE = new Set(["manifested", "in transit", "pending"]);
const RVP_CANCELABLE = new Set(["scheduled"]);
const REPL_CANCELABLE = new Set(["manifested", "in transit", "pending"]);

const NON_CANCELABLE = new Set([
  "dispatched",
  "delivered",
  "dto",
  "rto",
  "lost",
  "closed",
  "cancelled",
  "canceled",
]);

const statusMatchesAllowed = (key, allowedSet) =>
  [...allowedSet].some((allowed) => key === allowed || key.startsWith(`${allowed} `));

const resolveCancelEligibility = ({
  delhiveryStatus,
  shipmentKind = "forward",
  paymentMode = "",
}) => {
  const key = normalizeCourierStatusKey(delhiveryStatus);
  if (!key) {
    return {
      cancelable: false,
      reason: "Delhivery shipment status could not be verified.",
    };
  }
  if (NON_CANCELABLE.has(key)) {
    return {
      cancelable: false,
      reason: `Cancellation is not allowed when Delhivery status is "${delhiveryStatus}".`,
    };
  }

  const kind = String(shipmentKind || "forward").toLowerCase();
  let allowedSet = FORWARD_CANCELABLE;
  if (kind === "rvp" || kind === "pickup") {
    allowedSet = RVP_CANCELABLE;
  } else if (kind === "repl") {
    allowedSet = REPL_CANCELABLE;
  }

  const pm = String(paymentMode || "").trim().toUpperCase();
  if (kind === "forward" && pm && !["COD", "PREPAID"].includes(pm)) {
    return {
      cancelable: false,
      reason: `Forward cancellation is not configured for payment mode "${paymentMode}".`,
    };
  }

  const cancelable = statusMatchesAllowed(key, allowedSet);
  return {
    cancelable,
    reason: cancelable
      ? ""
      : `Delhivery status "${delhiveryStatus}" is not eligible for cancellation.`,
    normalizedStatus: delhiveryStatus,
  };
};

const isDelhiveryMpsCancelIndividualEnabled = () =>
  String(process.env.DELHIVERY_MPS_CANCEL_INDIVIDUAL || "false")
    .trim()
    .toLowerCase() === "true";

const buildCancelRequestBody = (waybill) => ({
  waybill: String(waybill || "").trim(),
  cancellation: "true",
});

const sanitizeCancelResponseForAudit = (raw) => {
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

module.exports = {
  normalizeCourierStatusKey,
  FORWARD_CANCELABLE,
  RVP_CANCELABLE,
  REPL_CANCELABLE,
  NON_CANCELABLE,
  resolveCancelEligibility,
  isDelhiveryMpsCancelIndividualEnabled,
  buildCancelRequestBody,
  sanitizeCancelResponseForAudit,
};