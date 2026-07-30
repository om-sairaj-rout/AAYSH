const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const Tracking = require("../../models/upload/tracking.model");

const getTrackingByAwbs = async (req, res) => {
  try {
    const { awbs } = req.body;

    if (!Array.isArray(awbs) || awbs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty awbs array",
      });
    }

    const trackingData = await Promise.all(
      awbs.map(async (awb) => {
        const shipping = await Shipping.findOne({
          awbNumber: awb,
        }).lean();

        if (!shipping) {
          return {
            awb,
            success: false,
            message: "Shipment not found",
          };
        }

        const order = await Order.findById(shipping.orderId).lean();

        const history = await Tracking.find({
          shippingId: shipping._id,
        })
          .sort({ eventTime: 1 })
          .lean();

        return {
          awb: shipping.awbNumber,
          success: true,

          shipment_id: shipping.shipmentId,

          order_id: order?.externalOrderId || "",

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
        };
      })
    );

    return res.status(200).json({
      success: true,
      tracking_data: trackingData,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getTrackingByAwbs;