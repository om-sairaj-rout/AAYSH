const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");

const cancelOrder = async (req, res) => {
  try {
    const { order_id } = req.body;

    // ============================
    // Validation
    // ============================

    if (!Array.isArray(order_id) || order_id.length === 0) {
      return res.status(400).json({
        success: false,
        message: "order_id must be a non-empty array.",
      });
    }

    const cancelledOrders = [];
    const failedOrders = [];

    // ============================
    // Cancel Orders
    // ============================

    for (const id of order_id) {
      const order = await Order.findOne({
        externalOrderId: id,
      });

      if (!order) {
        failedOrders.push({
          order_id: id,
          reason: "Order not found",
        });
        continue;
      }

      const shipping = await Shipping.findOne({
        orderId: order._id,
      });

      if (!shipping) {
        failedOrders.push({
          order_id: id,
          reason: "Shipping record not found",
        });
        continue;
      }

      if (shipping.shippingStatus === "Cancelled") {
        failedOrders.push({
          order_id: id,
          reason: "Order already cancelled",
        });
        continue;
      }

      const cancellableStatuses = ["Pending", "Booked"];

if (!cancellableStatuses.includes(shipping.shippingStatus)) {
  failedOrders.push({
    order_id: id,
    reason: `Order cannot be cancelled because shipping status is '${shipping.shippingStatus}'.`,
  });
  continue;
}

shipping.shippingStatus = "Cancelled";
shipping.cancelledAt = new Date();

      await order.save();
      await shipping.save();

      await Tracking.create({
        shippingId: shipping._id,
        status: "Cancelled",
        remarks: "Order cancelled via API",
        updatedBy: req.user?.id || null,
      });

      cancelledOrders.push(order.externalOrderId);
    }

    if (cancelledOrders.length === 0) {
  return res.status(400).json({
    success: false,
    message: "No orders were cancelled.",
    failed_orders: failedOrders,
  });
}

return res.status(200).json({
  success: true,
  message:
    failedOrders.length > 0
      ? "Some orders were cancelled and some failed."
      : "Order cancelled successfully.",
  cancelled_orders: cancelledOrders,
  failed_orders: failedOrders,
});

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel orders.",
      error: error.message,
    });
  }
};

module.exports = cancelOrder;