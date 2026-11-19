const axios = require("axios");
const {
  getDelhiveryApiToken,
  getDelhiveryBaseUrl,
  getDelhiveryRequestTimeoutMs,
  isDelhiveryConfigured,
} = require("../../config/delhiveryConfig");
const { getWaybillAuthMode } = require("../../config/delhiveryAwbConfig");

const buildWaybillRequestConfig = (params = {}) => {
  const token = getDelhiveryApiToken();
  const mode = getWaybillAuthMode();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const query = { ...params };

  if (mode === "query" || mode === "both") {
    query.token = token;
  }
  if (mode === "header" || mode === "both") {
    headers.Authorization = `Token ${token}`;
  }

  return { headers, params: query };
};

const waybillGet = async (path, params = {}) => {
  if (!isDelhiveryConfigured()) {
    const error = new Error("Delhivery API token is not configured");
    error.code = "DELHIVERY_NOT_CONFIGURED";
    throw error;
  }

  const url = `${getDelhiveryBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const { headers, params: query } = buildWaybillRequestConfig(params);

  const response = await axios.get(url, {
    params: query,
    timeout: getDelhiveryRequestTimeoutMs(),
    headers,
    validateStatus: () => true,
  });

  return response;
};

const extractWaybillNumbers = (data) => {
  if (data == null) return [];

  if (Array.isArray(data)) {
    return data
      .map((item) =>
        typeof item === "object"
          ? item.waybill || item.awb || item.AWB || item.waybill_number
          : item
      )
      .filter(Boolean)
      .map(String);
  }

  if (typeof data === "string") {
    return data
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof data === "object") {
    if (Array.isArray(data.waybills)) {
      return data.waybills.map(String);
    }
    if (Array.isArray(data.data)) {
      return extractWaybillNumbers(data.data);
    }
    if (data.waybill) {
      return [String(data.waybill)];
    }
    if (data.upload_wbn) {
      return [String(data.upload_wbn)];
    }
  }

  return [];
};

const isValidAwbNumber = (value) => {
  const awb = String(value || "").trim();
  if (!awb) return false;
  if (awb.length < 6 || awb.length > 32) return false;
  return /^[A-Za-z0-9-]+$/.test(awb);
};

const mapWaybillApiError = (response) => {
  if (response.status === 401 || response.status === 403) {
    return {
      api_error: true,
      error_code: "AUTH_ERROR",
      message: "Delhivery waybill authentication failed.",
    };
  }
  if (response.status >= 500) {
    return {
      api_error: true,
      error_code: "SERVER_ERROR",
      message: "Delhivery waybill service unavailable.",
    };
  }
  if (response.status >= 400) {
    return {
      api_error: true,
      error_code: "CLIENT_ERROR",
      message: "Delhivery rejected the waybill request.",
    };
  }

  const numbers = extractWaybillNumbers(response.data)
    .map((n) => n.trim())
    .filter(isValidAwbNumber);

  if (!numbers.length) {
    return {
      api_error: true,
      error_code: "UNEXPECTED_RESPONSE",
      message: "Delhivery waybill response contained no valid AWB numbers.",
    };
  }

  return {
    api_error: false,
    awbNumbers: [...new Set(numbers)],
    raw: response.data,
  };
};

const fetchBulkWaybills = async (count) => {
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 10000);
  let response;
  try {
    response = await waybillGet("/waybill/api/bulk/json/", { count: safeCount });
  } catch (err) {
    return {
      api_error: true,
      error_code:
        err.code === "DELHIVERY_NOT_CONFIGURED" ? err.code : "NETWORK_ERROR",
      message:
        err.code === "DELHIVERY_NOT_CONFIGURED"
          ? err.message
          : "Delhivery bulk waybill request failed.",
    };
  }

  const mapped = mapWaybillApiError(response);
  return {
    requested: safeCount,
    http_status: response.status,
    ...mapped,
  };
};

const fetchSingleWaybill = async () => {
  let response;
  try {
    response = await waybillGet("/waybill/api/fetch/json/");
  } catch (err) {
    return {
      api_error: true,
      error_code:
        err.code === "DELHIVERY_NOT_CONFIGURED" ? err.code : "NETWORK_ERROR",
      message:
        err.code === "DELHIVERY_NOT_CONFIGURED"
          ? err.message
          : "Delhivery single waybill request failed.",
    };
  }

  const mapped = mapWaybillApiError(response);
  return {
    requested: 1,
    http_status: response.status,
    ...mapped,
  };
};

module.exports = {
  fetchBulkWaybills,
  fetchSingleWaybill,
  extractWaybillNumbers,
  isValidAwbNumber,
};
