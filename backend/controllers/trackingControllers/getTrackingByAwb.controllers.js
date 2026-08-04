const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");
const Order = require("../../models/upload/order.model");

const getTrackingByAwb = async (req, res) => {
  try {
    const { awb } = req.params;

    const shipment = await Shipping.findOne({
      awbNumber: awb,
    }).lean();

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const order = await Order.findById(shipment.orderId).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const trackingHistory = await Tracking.find({
      shippingId: shipment._id,
    })
      .sort({ eventTime: 1 })
      .lean();

    return res.status(200).json({
      tracking_data: {
        track_status: shipment.shippingStatus === "Delivered" ? 1 : 0,

        shipment_status: shipment.shippingStatus,

        shipment_track: [
          {
            shipment_id: shipment.shipmentId,

            order_id: order.externalOrderId,

            awb: shipment.awbNumber,

            courier: shipment.courierName,

            pickup_location: shipment.pickupLocation,

            current_status: shipment.shippingStatus,

            consignee_name:
              `${order.consigneeName} ${order.consigneeLastName}`.trim(),

            consignee_phone: order.billingPhone,

            origin: shipment.pickupLocation,

            destination: `${order.destinationCity}, ${order.destinationState}`,

            weight: shipment.totalWeight,
          },
        ],

        shipment_track_activities: trackingHistory.map((item) => ({
          date: item.eventTime,

          status: item.status,

          activity: item.remarks || item.status,

          location: item.location,

          failure_reason: item.failureReason || "",
        })),

        track_url: `${process.env.FRONTEND_URL}/track/awb/${shipment.awbNumber}`,
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

module.exports = getTrackingByAwb;