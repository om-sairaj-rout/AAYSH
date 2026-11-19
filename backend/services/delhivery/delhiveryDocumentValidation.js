const DELHIVERY_DOCUMENT_TYPES = Object.freeze([
  "SIGNATURE_URL",
  "RVP_QC_IMAGE",
  "EPOD",
  "SELLER_RETURN_IMAGE",
]);

const DELHIVERY_DOCUMENT_TYPE_SET = new Set(DELHIVERY_DOCUMENT_TYPES);

const DOCUMENT_LABELS = Object.freeze({
  SIGNATURE_URL: "Signature",
  RVP_QC_IMAGE: "RVP QC Image",
  EPOD: "EPOD",
  SELLER_RETURN_IMAGE: "Seller Return Image",
});

const validateDocType = (docType) => {
  const key = String(docType || "").trim();
  if (!DELHIVERY_DOCUMENT_TYPE_SET.has(key)) {
    return {
      ok: false,
      message: `Unsupported doc_type. Allowed: ${DELHIVERY_DOCUMENT_TYPES.join(", ")}`,
    };
  }
  return { ok: true, docType: key };
};

const ALLOWED_DOCUMENT_URL_HOSTS = [
  "delhivery.com",
  "amazonaws.com",
  "cloudfront.net",
];

const isAllowlistedDocumentUrl = (rawUrl) => {
  try {
    const parsed = new URL(String(rawUrl).trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOCUMENT_URL_HOSTS.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
};

const sanitizeDocumentMeta = (raw) => {
  if (raw == null) return { summary: "empty" };
  if (typeof raw !== "object") return { summary: String(raw).slice(0, 200) };
  try {
    const clone = JSON.parse(JSON.stringify(raw));
    const scrub = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        if (/token|auth|password|secret|authorization/i.test(key)) {
          obj[key] = "[redacted]";
        } else if (typeof obj[key] === "object") {
          scrub(obj[key]);
        }
      }
    };
    scrub(clone);
    return clone;
  } catch {
    return { summary: "unparseable" };
  }
};

const extractDocumentUrlFromJson = (data) => {
  if (!data || typeof data !== "object") return "";
  const candidates = [
    data.url,
    data.URL,
    data.document_url,
    data.documentUrl,
    data.link,
    data.file_url,
    data.data?.url,
    data.Data?.url,
  ];
  const found = candidates.find((v) => typeof v === "string" && v.trim());
  return found ? String(found).trim() : "";
};

const parseDelhiveryDocumentJsonPayload = (data, httpStatus) => {
  const sanitized = sanitizeDocumentMeta(data);
  if (httpStatus === 401 || httpStatus === 403) {
    return {
      ok: false,
      error_code: "AUTH_ERROR",
      message: "Delhivery authentication failed while fetching the document.",
      raw: sanitized,
    };
  }
  if (httpStatus >= 500) {
    return {
      ok: false,
      error_code: "SERVER_ERROR",
      message: "Delhivery server error. Try again later.",
      raw: sanitized,
    };
  }
  if (httpStatus === 404) {
    return {
      ok: false,
      error_code: "NOT_FOUND",
      message: "Document is not available for this waybill.",
      raw: sanitized,
    };
  }
  if (httpStatus >= 400) {
    return {
      ok: false,
      error_code: "CLIENT_ERROR",
      message:
        (typeof data === "string" && data) ||
        data?.error ||
        data?.message ||
        "Delhivery could not return the requested document.",
      raw: sanitized,
    };
  }

  const documentUrl = extractDocumentUrlFromJson(data);
  if (documentUrl && isAllowlistedDocumentUrl(documentUrl)) {
    return {
      ok: true,
      delivery: "url",
      url: documentUrl,
      raw: sanitized,
    };
  }

  const base64 =
    data?.data ||
    data?.file ||
    data?.document ||
    data?.content ||
    "";
  if (typeof base64 === "string" && base64.length > 40) {
    return {
      ok: true,
      delivery: "base64",
      base64,
      contentType: data?.content_type || data?.contentType || "application/octet-stream",
      filename: data?.filename || data?.file_name || "delhivery-document",
      raw: sanitized,
    };
  }

  if (data?.success === false || data?.Success === false) {
    return {
      ok: false,
      error_code: "UNAVAILABLE",
      message: data?.message || data?.error || "Document unavailable.",
      raw: sanitized,
    };
  }

  return {
    ok: false,
    error_code: "UNRECOGNIZED_FORMAT",
    message:
      "Delhivery returned an unrecognized document payload. Verify response format on staging.",
    raw: sanitized,
  };
};

module.exports = {
  DELHIVERY_DOCUMENT_TYPES,
  DELHIVERY_DOCUMENT_TYPE_SET,
  DOCUMENT_LABELS,
  validateDocType,
  isAllowlistedDocumentUrl,
  parseDelhiveryDocumentJsonPayload,
  extractDocumentUrlFromJson,
  sanitizeDocumentMeta,
};