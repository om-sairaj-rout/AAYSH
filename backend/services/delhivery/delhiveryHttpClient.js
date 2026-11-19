const axios = require("axios");
const {
  getDelhiveryApiToken,
  getDelhiveryBaseUrl,
  getDelhiveryRequestTimeoutMs,
  isDelhiveryConfigured,
} = require("../../config/delhiveryConfig");

const delhiveryGet = async (path, params = {}) => {
  if (!isDelhiveryConfigured()) {
    const error = new Error("Delhivery API token is not configured");
    error.code = "DELHIVERY_NOT_CONFIGURED";
    throw error;
  }

  const url = `${getDelhiveryBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await axios.get(url, {
    params,
    timeout: getDelhiveryRequestTimeoutMs(),
    headers: {
      Authorization: `Token ${getDelhiveryApiToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  return response;
};

const delhiveryPostFormJson = async (path, dataObject = {}) => {
  if (!isDelhiveryConfigured()) {
    const error = new Error("Delhivery API token is not configured");
    error.code = "DELHIVERY_NOT_CONFIGURED";
    throw error;
  }

  const url = `${getDelhiveryBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const body = new URLSearchParams();
  body.set("format", "json");
  body.set("data", JSON.stringify(dataObject));

  const response = await axios.post(url, body.toString(), {
    timeout: getDelhiveryRequestTimeoutMs(),
    headers: {
      Authorization: `Token ${getDelhiveryApiToken()}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    validateStatus: () => true,
  });

  return response;
};

const delhiveryPostJson = async (path, bodyObject = {}) => {
  if (!isDelhiveryConfigured()) {
    const error = new Error("Delhivery API token is not configured");
    error.code = "DELHIVERY_NOT_CONFIGURED";
    throw error;
  }

  const url = `${getDelhiveryBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await axios.post(url, bodyObject, {
    timeout: getDelhiveryRequestTimeoutMs(),
    headers: {
      Authorization: `Token ${getDelhiveryApiToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  return response;
};

module.exports = {
  delhiveryGet,
  delhiveryPostFormJson,
  delhiveryPostJson,
};
