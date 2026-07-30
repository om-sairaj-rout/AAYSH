const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const Tracking = require("../../models/upload/tracking.model");

const getTrackingByShipmentId = async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const shipping = await Shipping.findOne({
      shipmentId,
    }).lean();

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const order = await Order.findById(shipping.orderId).lean();

    const history = await Tracking.find({
      shippingId: shipping._id,
    })
      .sort({ eventTime: 1 })
      .lean();

    return res.status(200).json({
      success: true,

      tracking_data: {
        shipment_id: shipping.shipmentId,

        order_id: order?.externalOrderId || "",

        awb: shipping.awbNumber,

        courier_name: shipping.courierName,

        current_status: shipping.shippingStatus,

        tracking_url: `https://www.aayshexpress.com/track/${shipping.awbNumber}`,

        tracking_history: history.map((item) => ({
          date: item.eventTime,
          status: item.status,
          location: item.location,
          remarks: item.remarks,
          failure_reason: item.failureReason,
        })),
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getTrackingByShipmentId;