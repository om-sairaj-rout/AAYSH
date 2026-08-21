const Order = require("../../models/upload/order.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const {
  parseDocumentTypes,
  validateHighValueDocuments,
  uploadOrderDocuments,
} = require("../../utils/orderDocuments");

const mapOrderDocuments = (order) =>
  (order.documents || []).map((document, index) => ({
    index,
    documentType: document.documentType,
    fileName: document.fileName,
    uploadedAt: document.uploadedAt,
  }));

const uploadOrderDocumentsController = async (req, res) => {
  try {
    const orderId = String(req.params.orderId || "").trim();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!userOwnsOrder(order, req)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this order",
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const documentTypes = parseDocumentTypes(req.body.document_types);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one document file is required",
      });
    }

    if (documentTypes.length !== files.length) {
      return res.status(400).json({
        success: false,
        message: "Each uploaded document must have a matching document type",
      });
    }

    const existingTypes = (order.documents || []).map((doc) => doc.documentType);
    const highValueError = validateHighValueDocuments(order.invoiceValue, [
      ...existingTypes,
      ...documentTypes,
    ]);

    if (highValueError) {
      return res.status(400).json({
        success: false,
        message: highValueError,
      });
    }

    const uploadedDocuments = await uploadOrderDocuments({
      orderId: order._id,
      files,
      documentTypes,
    });

    order.documents = [...(order.documents || []), ...uploadedDocuments];
    await order.save();

    const documents = mapOrderDocuments(order);

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      documents,
    });
  } catch (error) {
    console.error("Upload order document error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload document",
    });
  }
};

module.exports = uploadOrderDocumentsController;
