const axios = require("axios");
const {
  getTrackonTrackingBaseUrl,
  getTrackonTrackingPath,
  getTrackonAppKey,
  getTrackonUserId,
  getTrackonPassword,
  isTrackonTrackingConfigured,
  getTrackonRequestTimeoutMs,
} = require("../../config/trackonTrackingConfig");

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const fetchTrackonAwbTracking = async (awbNumber) => {
  const awb = String(awbNumber || "").trim();
  if (!awb) {
    return {
      ok: false,
      error_code: "INVALID_AWB",
      message: "AWB number is required.",
    };
  }

  if (!isTrackonTrackingConfigured()) {
    return {
      ok: false,
      error_code: "TRACKON_NOT_CONFIGURED",
      message: "Trackon tracking credentials are not configured.",
    };
  }

  const url = `${getTrackonTrackingBaseUrl()}${getTrackonTrackingPath()}`;

  try {
    const response = await axios.get(url, {
      params: {
        AWBNo: awb,
        AppKey: getTrackonAppKey(),
        userID: getTrackonUserId(),
        Password: getTrackonPassword(),
      },
      timeout: getTrackonRequestTimeoutMs(),
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error_code: "AUTH_ERROR",
        message: "Trackon authentication failed.",
        http_status: response.status,
      };
    }

    if (response.status >= 500) {
      return {
        ok: false,
        error_code: "SERVER_ERROR",
        uncertain: true,
        message: "Trackon tracking server error.",
        http_status: response.status,
      };
    }

    if (response.status >= 400) {
      return {
        ok: false,
        error_code: "CLIENT_ERROR",
        message: "Trackon tracking request failed.",
        http_status: response.status,
        raw: response.data,
      };
    }

    const data = response.data;
    const responseStatus = data?.ResponseStatus || data?.responseStatus || null;
    const errorCode = String(
      responseStatus?.ErrorCode ?? responseStatus?.errorCode ?? ""
    ).trim();

    if (errorCode && errorCode !== "0" && errorCode.toLowerCase() !== "success") {
      return {
        ok: false,
        error_code: "TRACKON_API_ERROR",
        message: String(
          responseStatus?.Message || responseStatus?.message || "Trackon API error"
        ).slice(0, 500),
        trackon_error_code: errorCode,
        raw: data,
      };
    }

    return { ok: true, raw: data, http_status: response.status };
  } catch (err) {
    if (isTimeoutError(err)) {
      return {
        ok: false,
        error_code: "TIMEOUT",
        uncertain: true,
        message: "Trackon tracking request timed out.",
      };
    }
    return {
      ok: false,
      error_code: "NETWORK_ERROR",
      uncertain: true,
      message: err.message || "Trackon tracking network error.",
    };
  }
};

module.exports = {
  fetchTrackonAwbTracking,
  isTimeoutError,
};