const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const { uploadShipmentPod } = require("../../utils/shipmentPod");

const uploadShipmentPodController = async (req, res) => {
  try {
    const awbNumber = String(req.params.awbNumber || "").trim();
    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required.",
      });
    }

    const shipping = await Shipping.findOne({ awbNumber });
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found for this AWB.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "POD file is required.",
      });
    }

    if (shipping.shippingStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "POD can only be uploaded after the shipment is marked Delivered.",
      });
    }

    const uploadResult = await uploadShipmentPod({
      shipmentId: shipping.shipmentId,
      file: req.file,
      uploadedBy: req.user?.id,
    });

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        message: uploadResult.message,
      });
    }

    shipping.podDocument = uploadResult.podDocument;
    await shipping.save();

    const order = await Order.findById(shipping.orderId)
      .select("externalOrderId companyID")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Proof of delivery uploaded successfully.",
      data: {
        awbNumber: shipping.awbNumber,
        shipmentId: shipping.shipmentId,
        orderId: order?.externalOrderId,
        pod: {
          fileName: shipping.podDocument.fileName,
          uploadedAt: shipping.podDocument.uploadedAt,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to upload POD.",
    });
  }
};

module.exports = uploadShipmentPodController;
