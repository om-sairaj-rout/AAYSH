const { uploadDocumentToS3, getPresignedDownloadUrl } = require("./s3");
const {
  HIGH_VALUE_INVOICE_THRESHOLD,
  REQUIRED_HIGH_VALUE_DOCUMENT_TYPES,
  isValidOrderDocumentType,
} = require("../constants/orderDocuments");

const parseDocumentTypes = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim().toUpperCase());
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim().toUpperCase());
      }
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
    }
  }

  return [];
};

const validateHighValueDocuments = (invoiceValue, documentTypes = []) => {
  if (Number(invoiceValue) < HIGH_VALUE_INVOICE_THRESHOLD) {
    return null;
  }

  const normalized = documentTypes.map((type) => String(type).toUpperCase());
  const hasRequired = REQUIRED_HIGH_VALUE_DOCUMENT_TYPES.some((type) =>
    normalized.includes(type)
  );

  if (!hasRequired) {
    return `At least one ${REQUIRED_HIGH_VALUE_DOCUMENT_TYPES.join(" or ")} document is required when invoice value is ₹50,000 or above`;
  }

  return null;
};

const uploadOrderDocuments = async ({ orderId, files = [], documentTypes = [] }) => {
  const uploaded = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const documentType = documentTypes[index] || "OTHER";

    if (!isValidOrderDocumentType(documentType)) {
      throw new Error(`Invalid document type: ${documentType}`);
    }

    const meta = await uploadDocumentToS3({
      buffer: file.buffer,
      originalName: file.originalname,
      folder: `documents/orders/${orderId}`,
      contentType: file.mimetype || "application/octet-stream",
    });

    uploaded.push({
      documentType,
      fileName: meta.fileName,
      s3Key: meta.s3Key,
      s3Bucket: meta.s3Bucket,
      contentType: file.mimetype || "application/octet-stream",
      uploadedAt: new Date(),
    });
  }

  return uploaded;
};

const attachDocumentDownloadUrls = async (documents = []) => {
  const enriched = [];

  for (const document of documents) {
    if (!document?.s3Key) {
      enriched.push(document);
      continue;
    }

    const downloadUrl = await getPresignedDownloadUrl(document.s3Key);
    enriched.push({
      ...document,
      downloadUrl,
    });
  }

  return enriched;
};

module.exports = {
  parseDocumentTypes,
  validateHighValueDocuments,
  uploadOrderDocuments,
  attachDocumentDownloadUrls,
  HIGH_VALUE_INVOICE_THRESHOLD,
};
