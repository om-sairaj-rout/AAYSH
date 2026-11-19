const { delhiveryGet } = require("./delhiveryHttpClient");

const extractTatPayload = (data) => {
  if (!data || typeof data !== "object") {
    return { display: null, raw: data };
  }

  const candidates = [
    data.tat,
    data.TAT,
    data.expected_tat,
    data.expected_delivery_date,
    data.edd,
    data.delivery_date,
    data.data?.tat,
    data.data?.expected_delivery_date,
  ].filter((v) => v !== undefined && v !== null && String(v).trim() !== "");

  const display = candidates.length ? String(candidates[0]) : null;

  return {
    display,
    raw: data,
  };
};

const fetchExpectedTat = async ({
  originPin,
  destinationPin,
  mot = "S",
  pdt = "B2C",
  expectedPickupDate,
}) => {
  const origin = String(originPin || "").replace(/\D/g, "");
  const destination = String(destinationPin || "").replace(/\D/g, "");

  if (!/^\d{6}$/.test(origin)) {
    return {
      ok: false,
      api_error: true,
      error_code: "MISSING_ORIGIN_PIN",
      message: "Origin pincode is required for Delhivery TAT.",
    };
  }

  if (!/^\d{6}$/.test(destination)) {
    return {
      ok: false,
      api_error: true,
      error_code: "INVALID_DESTINATION_PIN",
      message: "Destination pincode must be a 6-digit number.",
    };
  }

  const params = {
    origin_pin: origin,
    destination_pin: destination,
    mot,
    pdt,
  };

  if (expectedPickupDate) {
    params.expected_pickup_date = String(expectedPickupDate).trim();
  }

  let response;
  try {
    response = await delhiveryGet("/api/dc/expected_tat", params);
  } catch (err) {
    return {
      ok: false,
      api_error: true,
      error_code: err.code === "DELHIVERY_NOT_CONFIGURED" ? err.code : "NETWORK_ERROR",
      message:
        err.code === "DELHIVERY_NOT_CONFIGURED"
          ? err.message
          : "Delhivery TAT request failed. Please try again.",
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
      message: "Delhivery TAT service is unavailable. Try again later.",
    };
  }

  if (response.status >= 400) {
    return {
      ok: false,
      api_error: true,
      error_code: "CLIENT_ERROR",
      message: "Delhivery rejected the TAT request.",
    };
  }

  const parsed = extractTatPayload(response.data);

  return {
    ok: true,
    api_error: false,
    origin_pin: origin,
    destination_pin: destination,
    mot,
    pdt,
    expected_pickup_date: expectedPickupDate || null,
    tat: parsed.display,
    tat_raw: parsed.raw,
    message: parsed.display
      ? `Estimated delivery (Delhivery): ${parsed.display}`
      : "Delhivery returned TAT data without a recognized display field.",
  };
};

module.exports = {
  fetchExpectedTat,
};
