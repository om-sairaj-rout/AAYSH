const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");

const getTrackingByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      externalOrderId: orderId,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const shipping = await Shipping.findOne({
      orderId: order._id,
    }).lean();

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const history = await Tracking.find({
      shippingId: shipping._id,
    })
      .sort({ eventTime: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      tracking_data: {
        track_status: history.length > 0 ? 1 : 0,

        shipment_track: {
          order_id: order.externalOrderId,
          shipment_id: shipping.shipmentId,
          awb: shipping.awbNumber,
          courier: shipping.courierName,
          pickup_location: shipping.pickupLocation,
          current_status: shipping.shippingStatus,
          payment_method: order.paymentMethod,
          customer_name: `${order.consigneeName} ${order.consigneeLastName}`.trim(),
          customer_phone: order.billingPhone,
          destination: `${order.destinationCity}, ${order.destinationState}`,
          weight: order.weight,
          dimensions: `${order.length} x ${order.breadth} x ${order.height}`,
          products: order.orderItems.map((item) => ({
            name: item.name,
            sku: item.sku,
            quantity: item.units,
          })),
        },

        shipment_track_activities: history.map((item) => ({
          date: item.eventTime,
          status: item.status,
          activity: item.remarks || item.status,
          location: item.location,
          failure_reason: item.failureReason || "",
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getTrackingByOrderId;