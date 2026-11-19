const axios = require("axios");
const {
  getDelhiveryApiToken,
  getDelhiveryBaseUrl,
  getDelhiveryRequestTimeoutMs,
  isDelhiveryConfigured,
} = require("../../config/delhiveryConfig");
const { parseDelhiveryDocumentJsonPayload } = require("./delhiveryDocumentValidation");

const DOCUMENT_PATH = "/api/rest/fetch/pkg/document/";

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const isJsonContentType = (contentType = "") =>
  /json/i.test(contentType) || /javascript/i.test(contentType);

const guessFilename = (docType, contentType) => {
  if (/pdf/i.test(contentType)) return `${docType}.pdf`;
  if (/png/i.test(contentType)) return `${docType}.png`;
  if (/jpeg|jpg/i.test(contentType)) return `${docType}.jpg`;
  return `${docType}.bin`;
};

const fetchDelhiveryPackageDocument = async ({ waybill, docType }) => {
  const wb = String(waybill || "").trim();
  const dt = String(docType || "").trim();
  if (!wb || !dt) {
    return {
      ok: false,
      error_code: "INVALID_PARAMS",
      message: "waybill and doc_type are required.",
    };
  }

  if (!isDelhiveryConfigured()) {
    return {
      ok: false,
      error_code: "DELHIVERY_NOT_CONFIGURED",
      message: "Delhivery API token is not configured",
    };
  }

  const url = `${getDelhiveryBaseUrl()}${DOCUMENT_PATH}`;

  try {
    const response = await axios.get(url, {
      params: { doc_type: dt, waybill: wb },
      timeout: getDelhiveryRequestTimeoutMs(),
      responseType: "arraybuffer",
      headers: {
        Authorization: `Token ${getDelhiveryApiToken()}`,
        Accept: "*/*",
      },
      validateStatus: () => true,
      maxRedirects: 0,
    });

    const contentType = String(response.headers["content-type"] || "").trim();

    if (isJsonContentType(contentType) || response.status >= 400) {
      let data = null;
      try {
        const text = Buffer.from(response.data || "").toString("utf8");
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: Buffer.from(response.data || "").toString("utf8").slice(0, 300) };
      }
      const parsed = parseDelhiveryDocumentJsonPayload(data, response.status);
      return { ...parsed, http_status: response.status };
    }

    if (!response.data || response.data.byteLength === 0) {
      return {
        ok: false,
        error_code: "NOT_FOUND",
        message: "Document is empty or unavailable.",
        http_status: response.status,
      };
    }

    return {
      ok: true,
      delivery: "binary",
      data: Buffer.from(response.data),
      contentType: contentType || "application/octet-stream",
      filename: guessFilename(dt, contentType),
      http_status: response.status,
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      return {
        ok: false,
        error_code: "TIMEOUT",
        message: "Delhivery document request timed out.",
      };
    }
    return {
      ok: false,
      error_code: "NETWORK_ERROR",
      message: err.message || "Network error fetching Delhivery document.",
    };
  }
};

module.exports = {
  DOCUMENT_PATH,
  fetchDelhiveryPackageDocument,
};