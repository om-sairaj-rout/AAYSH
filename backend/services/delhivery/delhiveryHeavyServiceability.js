const { delhiveryGet } = require("./delhiveryHttpClient");

const normalizeToken = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const parsePaymentTypeAvailability = (paymentTypeField) => {
  const result = {
    cod_available: null,
    prepaid_available: null,
    payment_types_raw: paymentTypeField ?? null,
    payment_types: [],
  };

  if (paymentTypeField == null) {
    return result;
  }

  const addType = (label, serviceable) => {
    const name = normalizeToken(label);
    if (!name) return;
    result.payment_types.push({ type: name, serviceable });
    if (name === "COD" || name === "CASH") {
      if (serviceable !== null) result.cod_available = serviceable;
    }
    if (name === "PREPAID" || name === "PRE-PAID" || name === "PRE PAID") {
      if (serviceable !== null) result.prepaid_available = serviceable;
    }
  };

  const yn = (v) => {
    const s = normalizeToken(v);
    if (["Y", "YES", "TRUE", "1"].includes(s)) return true;
    if (["N", "NO", "FALSE", "0"].includes(s)) return false;
    return null;
  };

  if (Array.isArray(paymentTypeField)) {
    paymentTypeField.forEach((entry) => {
      if (typeof entry === "string") {
        addType(entry, true);
        return;
      }
      if (entry && typeof entry === "object") {
        const label =
          entry.type ||
          entry.payment_type ||
          entry.paymentType ||
          entry.mode ||
          entry.name;
        const flag =
          entry.serviceable ??
          entry.available ??
          entry.enabled ??
          yn(entry.value);
        addType(label, flag === undefined || flag === null ? true : Boolean(flag));
      }
    });
    return result;
  }

  if (typeof paymentTypeField === "object") {
    Object.entries(paymentTypeField).forEach(([key, value]) => {
      addType(key, yn(value) ?? Boolean(value));
    });
    return result;
  }

  if (typeof paymentTypeField === "string") {
    paymentTypeField
      .split(/[,;|]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => addType(part, true));
  }

  return result;
};

const responseIndicatesNsz = (data) => {
  if (data == null) return true;
  if (typeof data === "string") {
    return normalizeToken(data) === "NSZ";
  }

  const status = normalizeToken(
    data.status || data.serviceability_status || data.serviceabilityStatus
  );
  if (status === "NSZ" || status === "NON_SERVICEABLE") return true;

  const remark = String(
    data.remarks || data.remark || data.message || data.rmk || ""
  ).toUpperCase();
  if (remark === "NSZ" || remark.includes("NON SERVICEABLE")) return true;

  if (data.serviceable === false || data.is_serviceable === false) {
    return true;
  }

  return false;
};

const interpretHeavyServiceability = (destinationPin, data) => {
  if (
    typeof data?.payment_type === "string" &&
    normalizeToken(data.payment_type) === "NSZ"
  ) {
    return {
      serviceable: false,
      cod_available: false,
      prepaid_available: false,
      reason: "NSZ",
      message: `Destination pincode ${destinationPin} is not serviceable for Delhivery Heavy (NSZ).`,
      details: data,
    };
  }

  if (responseIndicatesNsz(data)) {
    return {
      serviceable: false,
      cod_available: false,
      prepaid_available: false,
      reason: "NSZ",
      message: `Destination pincode ${destinationPin} is not serviceable for Delhivery Heavy (NSZ).`,
      details: data,
    };
  }

  const paymentInfo = parsePaymentTypeAvailability(
    data.payment_type ?? data.payment_types ?? data.paymentType
  );

  const cod =
    paymentInfo.cod_available ??
    ynFromHeavyFlags(data.cod ?? data.COD ?? data.cash);
  const prepaid =
    paymentInfo.prepaid_available ??
    ynFromHeavyFlags(data.pre_paid ?? data.prepaid ?? data.Prepaid);

  const hasPaymentHints =
    paymentInfo.payment_types.length > 0 ||
    cod !== null ||
    prepaid !== null;

  if (!hasPaymentHints) {
    return {
      serviceable: true,
      cod_available: false,
      prepaid_available: false,
      reason: "PAYMENT_TYPE_UNKNOWN",
      message:
        "Delhivery Heavy returned a response without a recognizable payment_type. Verify parsing against live API output (see details.raw).",
      details: { raw: data, ...paymentInfo },
    };
  }

  const serviceable =
    cod === true || prepaid === true || paymentInfo.payment_types.some((p) => p.serviceable);

  if (!serviceable) {
    return {
      serviceable: false,
      cod_available: cod === true,
      prepaid_available: prepaid === true,
      reason: "NSZ",
      message: `Destination pincode ${destinationPin} is not serviceable for Delhivery Heavy.`,
      details: { raw: data, ...paymentInfo },
    };
  }

  if (cod === false) {
    return {
      serviceable: true,
      cod_available: false,
      prepaid_available: prepaid === true,
      reason: "COD_UNAVAILABLE",
      message: `Pincode ${destinationPin} is Heavy-serviceable but COD is not available.`,
      details: { raw: data, ...paymentInfo },
    };
  }

  if (cod === true) {
    return {
      serviceable: true,
      cod_available: true,
      prepaid_available: prepaid === true,
      reason: null,
      message: `Pincode ${destinationPin} is serviceable for Delhivery Heavy COD.`,
      details: { raw: data, ...paymentInfo },
    };
  }

  return {
    serviceable: true,
    cod_available: false,
    prepaid_available: prepaid === true,
    reason: "COD_UNKNOWN",
    message:
      "Pincode appears Heavy-serviceable but COD availability is unclear. Confirm with Delhivery.",
    details: { raw: data, ...paymentInfo },
  };
};

function ynFromHeavyFlags(value) {
  if (value == null || value === "") return null;
  const s = normalizeToken(value);
  if (["Y", "YES", "TRUE", "1"].includes(s)) return true;
  if (["N", "NO", "FALSE", "0"].includes(s)) return false;
  return null;
}

const checkHeavyPincodeServiceability = async (destinationPin) => {
  const pin = String(destinationPin || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(pin)) {
    return {
      ok: false,
      api_error: true,
      error_code: "INVALID_PINCODE",
      message: "Destination pincode must be a 6-digit number.",
    };
  }

  let response;
  try {
    response = await delhiveryGet("/api/dc/fetch/serviceability/pincode", {
      pincode: pin,
      product_type: "Heavy",
    });
  } catch (err) {
    return {
      ok: false,
      api_error: true,
      error_code:
        err.code === "DELHIVERY_NOT_CONFIGURED" ? err.code : "NETWORK_ERROR",
      message:
        err.code === "DELHIVERY_NOT_CONFIGURED"
          ? err.message
          : "Delhivery Heavy serviceability request failed. Please try again.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      api_error: true,
      error_code: "AUTH_ERROR",
      message:
        "Delhivery authentication failed for Heavy API. Verify account Heavy enablement and DELHIVERY_API_TOKEN.",
    };
  }

  if (response.status >= 500) {
    return {
      ok: false,
      api_error: true,
      error_code: "SERVER_ERROR",
      message:
        "Delhivery Heavy serviceability service is unavailable. Try again later.",
    };
  }

  if (response.status >= 400) {
    return {
      ok: false,
      api_error: true,
      error_code: "CLIENT_ERROR",
      message: "Delhivery rejected the Heavy serviceability request.",
      http_status: response.status,
    };
  }

  const data = response.data;
  if (typeof data !== "object" || data === null) {
    return {
      ok: false,
      api_error: true,
      error_code: "UNEXPECTED_RESPONSE",
      message: "Delhivery Heavy returned an unexpected response format.",
    };
  }

  return {
    ok: true,
    api_error: false,
    destination_pin: pin,
    courier: "Delhivery",
    product_type: "Heavy",
    http_status: response.status,
    ...interpretHeavyServiceability(pin, data),
  };
};

module.exports = {
  checkHeavyPincodeServiceability,
  parsePaymentTypeAvailability,
};
