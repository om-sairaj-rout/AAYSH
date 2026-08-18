const ReversePickup = require("../../models/reversePickup.model");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const Order = require("../../models/upload/order.model");
const {
  isReversePickupDocumentDownloadable,
  buildReversePickupDocumentPayload,
} = require("../../utils/reversePickupDocument");

const getReversePickupDocumentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderFilter = applyCompanyOrderFilter(req, {
      _id: orderId,
      isReversePickup: true,
    });

    const order = await Order.findOne(orderFilter).select("_id isReversePickup").lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Reverse pickup shipment not found",
      });
    }

    const request = await ReversePickup.findOne({ orderId: order._id }).lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "No reverse pickup record linked to this shipment",
      });
    }

    if (!isReversePickupDocumentDownloadable(request)) {
      return res.status(403).json({
        success: false,
        message:
          "Document is available only after the reverse pickup is approved and AWB is assigned",
      });
    }

    const payload = await buildReversePickupDocumentPayload(request);

    if (!payload.ok) {
      return res.status(payload.status).json({
        success: false,
        message: payload.message,
      });
    }

    return res.status(200).json({
      success: true,
      url: payload.url,
      fileName: payload.fileName,
      legacy: payload.legacy || false,
      requestId: request.requestId,
      awbNumber: request.awbNumber,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getReversePickupDocumentByOrder;
