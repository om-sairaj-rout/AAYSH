const { getPresignedDownloadUrl } = require("./s3");

const hasStoredDocument = (request) =>
  Boolean(
    request?.supportingDocumentS3Key?.trim() ||
      request?.supportingDocumentPath?.trim()
  );

/**
 * Shipment download is allowed only after admin approval and AWB assignment.
 */
const isReversePickupDocumentDownloadable = (request) => {
  if (!request) return false;
  if (request.status !== "awb_assigned") return false;
  if (!String(request.awbNumber || "").trim()) return false;
  return hasStoredDocument(request);
};

const buildReversePickupDocumentPayload = async (request) => {
  if (!hasStoredDocument(request)) {
    return {
      ok: false,
      status: 404,
      message: "No document found for this reverse pickup",
    };
  }

  if (request.supportingDocumentS3Key) {
    const url = await getPresignedDownloadUrl(request.supportingDocumentS3Key);
    return {
      ok: true,
      url,
      fileName: request.supportingDocumentName || "reverse-pickup-document",
      legacy: false,
    };
  }

  return {
    ok: true,
    url: request.supportingDocumentPath,
    fileName: request.supportingDocumentName || "reverse-pickup-document",
    legacy: true,
  };
};

const buildReversePickupSummary = (request) => {
  if (!request) return null;

  const pickup = {
    name: request.fromName || "",
    phone: request.fromPhone || "",
    email: request.fromEmail || "",
    address: request.fromAddress || "",
    address2: request.fromAddress2 || "",
    city: request.fromCity || "",
    state: request.fromState || "",
    pincode: request.fromPincode || "",
  };

  const delivery = {
    name: request.toName || "",
    phone: request.toPhone || "",
    address: request.toAddress || "",
    city: request.toCity || "",
    state: request.toState || "",
    pincode: request.toPincode || "",
  };

  return {
    requestId: request.requestId,
    status: request.status,
    awbNumber: request.awbNumber || "",
    documentName: request.supportingDocumentName || "",
    documentDownloadable: isReversePickupDocumentDownloadable(request),
    pickup,
    delivery,
  };
};

module.exports = {
  hasStoredDocument,
  isReversePickupDocumentDownloadable,
  buildReversePickupDocumentPayload,
  buildReversePickupSummary,
};
