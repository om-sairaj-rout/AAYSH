const ReversePickup = require("../../models/reversePickup.model");
const { parseISODateOnly } = require("../../utils/dateTime");
const { uploadDocumentToS3 } = require("../../utils/s3");

const MODE_TO_SERVICE = {
  Surface: "surface",
  Air: "air",
  Prime: "prime",
};

const HIGH_VALUE_INVOICE_THRESHOLD = 50000;

const buildPayload = (body, documentMeta, user) => {
  const pickupDate = parseISODateOnly(body.pickupDate);
  const requestDate = parseISODateOnly(body.requestDate) || new Date();
  const modeType = ["Surface", "Air", "Prime"].includes(body.modeType)
    ? body.modeType
    : "Surface";

  const remarks = String(body.remarks || body.notes || "").trim();

  return {
    requestId: `REV-RP-${Date.now()}`,
    companyID: body.companyID?.toUpperCase() || user.companyID,
    requestedBy: user.id,
    status: "pending",
    requestDate,
    originalAwbNumber: String(body.originalAwbNumber || "").trim(),
    pickupFor: String(body.pickupFor || user.companyName || "").trim(),
    modeType,
    fromName: String(body.fromName).trim(),
    fromPhone: String(body.fromPhone).trim(),
    fromEmail: String(body.fromEmail || "").trim(),
    fromAddress: String(body.fromAddress).trim(),
    fromAddress2: String(body.fromAddress2 || "").trim(),
    fromCity: String(body.fromCity).trim(),
    fromState: String(body.fromState).trim(),
    fromPincode: String(body.fromPincode).trim(),
    fromCountry: String(body.fromCountry || "India").trim(),
    toName: String(body.toName).trim(),
    toPhone: String(body.toPhone || "").trim(),
    toAddress: String(body.toAddress).trim(),
    toCity: String(body.toCity).trim(),
    toState: String(body.toState).trim(),
    toPincode: String(body.toPincode).trim(),
    toCountry: String(body.toCountry || "India").trim(),
    toLocationLabel: String(body.toLocationLabel || "").trim(),
    itemDescription: String(body.itemDescription || "").trim(),
    paperWork: ["INVOICE", "EWAYBILL", "DELIVERY_CHALLAN", "OTHER"].includes(
      body.paperWork
    )
      ? body.paperWork
      : "INVOICE",
    invoiceValue: Number(body.invoiceValue) || 0,
    supportingDocumentName: documentMeta?.fileName || "",
    supportingDocumentPath: documentMeta?.localPath || "",
    supportingDocumentS3Key: documentMeta?.s3Key || "",
    supportingDocumentS3Bucket: documentMeta?.s3Bucket || "",
    pieces: Math.max(1, Number(body.pieces) || 1),
    weight: Number(body.weight) || 0,
    length: Number(body.length) || 0,
    breadth: Number(body.breadth) || 0,
    height: Number(body.height) || 0,
    paymentMethod: body.paymentMethod === "COD" ? "COD" : "Prepaid",
    preferredServiceType:
      MODE_TO_SERVICE[modeType] ||
      (["surface", "air", "prime"].includes(body.preferredServiceType)
        ? body.preferredServiceType
        : "surface"),
    pickupDate,
    pickupTime: String(body.pickupTime || "11:00").trim(),
    notes: remarks,
    remarks,
  };
};

const createReversePickup = async (req, res) => {
  try {
    const body = req.body;

    const required = [
      "fromName",
      "fromPhone",
      "fromAddress",
      "fromCity",
      "fromState",
      "fromPincode",
      "toName",
      "toAddress",
      "toCity",
      "toState",
      "toPincode",
      "pickupDate",
    ];

    for (const field of required) {
      if (!String(body[field] || "").trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    if (!parseISODateOnly(body.pickupDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup date",
      });
    }

    const companyID = req.user.companyID;
    if (!companyID && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Company ID is required to submit a reverse pickup request",
      });
    }

    const invoiceValue = Number(body.invoiceValue) || 0;
    if (invoiceValue >= HIGH_VALUE_INVOICE_THRESHOLD && !req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Supporting document is required when invoice value is ₹50,000 or above",
      });
    }

    const documentMeta = {
      fileName: "",
      s3Key: "",
      s3Bucket: "",
      localPath: "",
    };

    if (req.file) {
      try {
        const uploaded = await uploadDocumentToS3({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          folder: "documents/reverse-pickup",
          contentType: req.file.mimetype,
        });
        documentMeta.fileName = uploaded.fileName;
        documentMeta.s3Key = uploaded.s3Key;
        documentMeta.s3Bucket = uploaded.s3Bucket;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: uploadError.message || "Failed to upload document",
        });
      }
    }

    const request = await ReversePickup.create(
      buildPayload(body, documentMeta, req.user)
    );

    return res.status(201).json({
      success: true,
      message: "Reverse pickup request submitted for admin approval",
      request,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = createReversePickup;
