const { delhiveryPostJson } = require("./delhiveryHttpClient");
const { parseDelhiveryEditResponse } = require("./delhiveryEditShipmentValidation");
const {
  buildCancelRequestBody,
  sanitizeCancelResponseForAudit,
} = require("./delhiveryCancelShipmentValidation");

const CANCEL_PATH = "/api/p/edit";

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const cancelDelhiveryShipmentWaybill = async (waybill) => {
  const payload = buildCancelRequestBody(waybill);
  if (!payload.waybill) {
    return {
      api_error: true,
      error_code: "INVALID_WAYBILL",
      message: "waybill is required for Delhivery cancellation.",
    };
  }

  try {
    const response = await delhiveryPostJson(CANCEL_PATH, payload);
    const parsed = parseDelhiveryEditResponse(response);
    return {
      ...parsed,
      api_error: !parsed.success,
      http_status: response.status,
      requestBody: { waybill: payload.waybill, cancellation: payload.cancellation },
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      return {
        api_error: true,
        uncertain: true,
        error_code: "TIMEOUT",
        message:
          "Delhivery cancellation timed out. Verify shipment on Delhivery before retrying.",
      };
    }
    if (err.code === "DELHIVERY_NOT_CONFIGURED") {
      return {
        api_error: true,
        error_code: err.code,
        message: err.message,
      };
    }
    return {
      api_error: true,
      uncertain: true,
      error_code: "NETWORK_ERROR",
      message: "Delhivery cancellation failed due to a network error.",
    };
  }
};

module.exports = {
  CANCEL_PATH,
  cancelDelhiveryShipmentWaybill,
  sanitizeCancelResponseForAudit,
};