const { uploadDocumentToS3 } = require("./s3");

const POD_MAX_BYTES = 10 * 1024 * 1024;
const POD_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const POD_ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const validatePodUploadFile = (file) => {
  if (!file || !file.buffer?.length) {
    return { ok: false, message: "POD file is required." };
  }
  if (file.size > POD_MAX_BYTES) {
    return {
      ok: false,
      message: "POD file must be 10 MB or smaller.",
    };
  }
  const mime = String(file.mimetype || "").toLowerCase();
  if (!POD_ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      message: "POD must be a PDF, JPG, or PNG file.",
    };
  }
  const name = String(file.originalname || "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ext && !POD_ALLOWED_EXT.has(ext)) {
    return {
      ok: false,
      message: "POD file extension must be .pdf, .jpg, .jpeg, or .png.",
    };
  }
  return { ok: true };
};

const uploadShipmentPod = async ({ shipmentId, file, uploadedBy }) => {
  const check = validatePodUploadFile(file);
  if (!check.ok) {
    return { success: false, message: check.message };
  }

  const meta = await uploadDocumentToS3({
    buffer: file.buffer,
    originalName: file.originalname,
    folder: `documents/pod/${shipmentId}`,
    contentType: file.mimetype || "application/octet-stream",
  });

  return {
    success: true,
    podDocument: {
      fileName: meta.fileName || file.originalname,
      s3Key: meta.s3Key,
      s3Bucket: meta.s3Bucket,
      contentType: file.mimetype || "application/octet-stream",
      uploadedAt: new Date(),
      uploadedBy,
    },
  };
};

const getPodAvailability = (shipping) => {
  const status = String(shipping?.shippingStatus || "").trim();
  if (status !== "Delivered") {
    return {
      podStatus: "not_delivered",
      message: "POD is available after the shipment is marked Delivered.",
      hasPod: false,
    };
  }
  if (!shipping?.podDocument?.s3Key) {
    return {
      podStatus: "not_uploaded",
      message: "POD not uploaded yet.",
      hasPod: false,
    };
  }
  return {
    podStatus: "available",
    message: "Proof of delivery is available.",
    hasPod: true,
    fileName: shipping.podDocument.fileName,
    uploadedAt: shipping.podDocument.uploadedAt,
  };
};

module.exports = {
  POD_MAX_BYTES,
  validatePodUploadFile,
  uploadShipmentPod,
  getPodAvailability,
};
