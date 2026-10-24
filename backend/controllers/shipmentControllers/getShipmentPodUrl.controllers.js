const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const { getPodAvailability } = require("../../utils/shipmentPod");
const { getPresignedDownloadUrl } = require("../../utils/s3");

const getShipmentPodUrl = async (req, res) => {
  try {
    const awbNumber = String(req.params.awbNumber || "").trim();
    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required.",
      });
    }

    const shipping = await Shipping.findOne({ awbNumber }).lean();
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found.",
      });
    }

    const order = await Order.findById(shipping.orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (!userOwnsOrder(order, req)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access POD for this shipment.",
      });
    }

    const podInfo = getPodAvailability(shipping);
    if (podInfo.podStatus === "not_delivered") {
      return res.status(400).json({
        success: false,
        message: podInfo.message,
      });
    }
    if (podInfo.podStatus === "not_uploaded") {
      return res.status(404).json({
        success: false,
        message: podInfo.message,
      });
    }

    const key = shipping.podDocument?.s3Key;
    if (!key) {
      return res.status(404).json({
        success: false,
        message: "POD not uploaded yet.",
      });
    }

    const downloadUrl = await getPresignedDownloadUrl(key);

    return res.status(200).json({
      success: true,
      data: {
        fileName: shipping.podDocument.fileName,
        contentType: shipping.podDocument.contentType,
        downloadUrl,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to generate POD download link.",
    });
  }
};

module.exports = getShipmentPodUrl;
