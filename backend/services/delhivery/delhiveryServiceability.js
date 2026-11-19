const { delhiveryGet } = require("./delhiveryHttpClient");

const normalizeYn = (value) => {
  const str = String(value ?? "")
    .trim()
    .toUpperCase();
  if (str === "Y" || str === "YES" || str === "TRUE" || str === "1") return true;
  if (str === "N" || str === "NO" || str === "FALSE" || str === "0") return false;
  return null;
};

const mapPostalEntry = (entry) => {
  const postal =
    entry?.postal_code ||
    entry?.PostalCode ||
    entry;

  if (!postal || typeof postal !== "object") {
    return null;
  }

  return {
    pin: String(postal.pin || postal.Pin || "").trim(),
    district: String(postal.district || postal.District || "").trim(),
    state_code: String(postal.state_code || postal.stateCode || "").trim(),
    cod: normalizeYn(postal.cod ?? postal.COD),
    pre_paid: normalizeYn(postal.pre_paid ?? postal.prepaid ?? postal.PrePaid),
    pickup: normalizeYn(postal.pickup ?? postal.Pickup),
    is_oda: normalizeYn(postal.is_oda ?? postal.isODA),
    remarks: String(postal.remarks || postal.Remarks || "").trim(),
  };
};

const interpretServiceability = (destinationPin, mapped) => {
  if (!mapped) {
    return {
      serviceable: false,
      cod_available: false,
      reason: "NSZ",
      message: "Destination pincode is not serviceable (NSZ).",
    };
  }

  const remarks = mapped.remarks;
  if (remarks.toLowerCase() === "embargo") {
    return {
      serviceable: false,
      cod_available: false,
      reason: "EMBARGO",
      message: `Pincode ${destinationPin} is temporarily non-serviceable (Embargo).`,
      details: mapped,
    };
  }

  if (mapped.cod === false) {
    return {
      serviceable: true,
      cod_available: false,
      reason: "COD_UNAVAILABLE",
      message: `Pincode ${destinationPin} is serviceable but COD is not available for Delhivery.`,
      details: mapped,
    };
  }

  if (mapped.cod === true) {
    return {
      serviceable: true,
      cod_available: true,
      reason: null,
      message: `Pincode ${destinationPin} is serviceable for Delhivery COD.`,
      details: mapped,
    };
  }

  return {
    serviceable: true,
    cod_available: false,
    reason: "COD_UNKNOWN",
    message:
      "Pincode appears in Delhivery data but COD availability is unclear. Confirm with Delhivery.",
    details: mapped,
  };
};

const checkB2CPincodeServiceability = async (destinationPin) => {
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
    response = await delhiveryGet("/c/api/pin-codes/json/", {
      filter_codes: pin,
    });
  } catch (err) {
    return {
      ok: false,
      api_error: true,
      error_code: err.code === "DELHIVERY_NOT_CONFIGURED" ? err.code : "NETWORK_ERROR",
      message:
        err.code === "DELHIVERY_NOT_CONFIGURED"
          ? err.message
          : "Delhivery serviceability request failed. Please try again.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      api_error: true,
      error_code: "AUTH_ERROR",
      message: "Delhivery authentication failed. Check DELHIVERY_API_TOKEN.",
    };
  }

  if (response.status >= 500) {
    return {
      ok: false,
      api_error: true,
      error_code: "SERVER_ERROR",
      message: "Delhivery serviceability service is unavailable. Try again later.",
    };
  }

  if (response.status >= 400) {
    return {
      ok: false,
      api_error: true,
      error_code: "CLIENT_ERROR",
      message: "Delhivery rejected the serviceability request.",
    };
  }

  const data = response.data;
  const deliveryCodes = Array.isArray(data?.delivery_codes)
    ? data.delivery_codes
    : [];

  if (!deliveryCodes.length) {
    return {
      ok: true,
      api_error: false,
      destination_pin: pin,
      courier: "Delhivery",
      product_type: "B2C",
      ...interpretServiceability(pin, null),
    };
  }

  const mapped =
    deliveryCodes.map(mapPostalEntry).find((row) => row?.pin === pin) ||
    mapPostalEntry(deliveryCodes[0]);

  return {
    ok: true,
    api_error: false,
    destination_pin: pin,
    courier: "Delhivery",
    product_type: "B2C",
    ...interpretServiceability(pin, mapped),
  };
};

module.exports = {
  checkB2CPincodeServiceability,
};
