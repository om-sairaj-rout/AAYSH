const { delhiveryPostJson, delhiveryGet } = require("./delhiveryHttpClient");
const { parseNdrSubmitResponse, sanitizeNdrPayloadForAudit } = require("./delhiveryNdrValidation");

const NDR_UPDATE_PATH = "/api/p/update";
const uplStatusPath = (uplId) =>
  `/api/cmu/get_bulk_upl/${encodeURIComponent(String(uplId))}?verbose=true`;

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const submitDelhiveryNdrAction = async ({ waybill, action }) => {
  const wb = String(waybill || "").trim();
  const act = String(action || "").trim();
  if (!wb || !act) {
    return {
      ok: false,
      error_code: "INVALID_PARAMS",
      message: "waybill and action are required.",
    };
  }

  const body = {
    data: [{ waybill: wb, act }],
  };

  try {
    const response = await delhiveryPostJson(NDR_UPDATE_PATH, body);
    const parsed = parseNdrSubmitResponse(response);
    return { ...parsed, requestBody: body, http_status: response.status };
  } catch (err) {
    if (isTimeoutError(err)) {
      return {
        ok: false,
        uncertain: true,
        error_code: "TIMEOUT",
        message:
          "NDR request timed out. Do not resubmit blindly; check UPL status if a UPL ID exists.",
      };
    }
    if (err.code === "DELHIVERY_NOT_CONFIGURED") {
      return { ok: false, error_code: err.code, message: err.message };
    }
    return {
      ok: false,
      uncertain: true,
      error_code: "NETWORK_ERROR",
      message: err.message || "Network error during NDR submission.",
    };
  }
};

const fetchDelhiveryUplStatus = async (uplId) => {
  const id = String(uplId || "").trim();
  if (!id) {
    return { ok: false, message: "UPL ID is required." };
  }
  try {
    const response = await delhiveryGet(uplStatusPath(id));
    const sanitized = sanitizeNdrPayloadForAudit(response?.data);
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error_code: "AUTH_ERROR",
        message: "Delhivery authentication failed.",
        raw: sanitized,
        http_status: response.status,
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        error_code: "SERVER_ERROR",
        message: "Delhivery server error fetching UPL status.",
        raw: sanitized,
        http_status: response.status,
      };
    }
    if (response.status >= 400) {
      return {
        ok: false,
        message: "Could not fetch UPL status from Delhivery.",
        raw: sanitized,
        http_status: response.status,
      };
    }
    return {
      ok: true,
      raw: sanitized,
      http_status: response.status,
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      return { ok: false, error_code: "TIMEOUT", message: "UPL status request timed out." };
    }
    return { ok: false, error_code: "NETWORK_ERROR", message: err.message };
  }
};

module.exports = {
  NDR_UPDATE_PATH,
  uplStatusPath,
  submitDelhiveryNdrAction,
  fetchDelhiveryUplStatus,
};