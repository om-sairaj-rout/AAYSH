const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const { attachDocumentDownloadUrls } = require("../../utils/orderDocuments");
const {
  isLocalDocumentKey,
  resolveLocalDocumentPath,
  LOCAL_BUCKET,
} = require("../../utils/s3");

const getOrderDocumentUrl = async (req, res) => {
  try {
    const orderId = String(req.params.orderId || "").trim();
    const documentIndex = Number(req.params.documentIndex);

    if (!orderId || Number.isNaN(documentIndex)) {
      return res.status(400).json({
        success: false,
        message: "Order ID and document index are required",
      });
    }

    const order = await Order.findById(orderId).lean();
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

    const document = order.documents?.[documentIndex];
    if (!document?.s3Key) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (
      document.s3Bucket === LOCAL_BUCKET ||
      isLocalDocumentKey(document.s3Key)
    ) {
      const filePath = resolveLocalDocumentPath(document.s3Key);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: "Document file not found on server",
        });
      }

      return res.download(
        filePath,
        document.fileName || path.basename(filePath)
      );
    }

    const [withUrl] = await attachDocumentDownloadUrls([document]);

    return res.status(200).json({
      success: true,
      url: withUrl.downloadUrl,
      document: withUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getOrderDocumentUrl;
