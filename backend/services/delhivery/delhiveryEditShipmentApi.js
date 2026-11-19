const { delhiveryPostJson } = require("./delhiveryHttpClient");
const { parseDelhiveryEditResponse } = require("./delhiveryEditShipmentValidation");

const EDIT_PATH = "/api/p/edit";

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const editDelhiveryShipmentWaybill = async (payload) => {
  const waybill = String(payload?.waybill || "").trim();
  if (!waybill) {
    return {
      api_error: true,
      error_code: "INVALID_PAYLOAD",
      message: "waybill is required for Delhivery edit.",
    };
  }

  try {
    const response = await delhiveryPostJson(EDIT_PATH, payload);
    const parsed = parseDelhiveryEditResponse(response);
    return {
      ...parsed,
      api_error: !parsed.success,
      http_status: response.status,
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      return {
        api_error: true,
        uncertain: true,
        error_code: "TIMEOUT",
        message:
          "Delhivery edit request timed out. Verify shipment on Delhivery before retrying.",
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
      message: "Delhivery edit request failed due to a network error.",
    };
  }
};

module.exports = {
  EDIT_PATH,
  editDelhiveryShipmentWaybill,
  parseDelhiveryEditResponse,
};
