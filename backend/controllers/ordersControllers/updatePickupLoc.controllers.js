const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const updatePickupLocation = async (req, res) => {
  try {
    const { order_id, pickup_location } = req.body;

    // ===========================
    // Validation
    // ===========================

    if (!Array.isArray(order_id) || order_id.length === 0) {
      return res.status(400).json({
        success: false,
        message: "order_id must be a non-empty array.",
      });
    }

    if (!pickup_location) {
      return res.status(400).json({
        success: false,
        message: "pickup_location is required.",
      });
    }

    const updatedOrders = [];
    const failedOrders = [];

    // ===========================
    // Update Orders
    // ===========================

    for (const id of order_id) {
      const order = await Order.findOne({ orderId: id });

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

      // Don't allow update after shipment has started
      if (shipping.shippingStatus !== "Not Shipped") {
        failedOrders.push({
          order_id: id,
          reason: `Pickup location cannot be updated when shipping status is '${shipping.shippingStatus}'.`,
        });
        continue;
      }

      // Update Order
      order.pickupLocation = pickup_location;
      await order.save();

      // Update Shipping
      shipping.pickupLocation = pickup_location;
      await shipping.save();

      updatedOrders.push(id);
    }

    return res.status(200).json({
      success: true,
      message: "Pickup location updated successfully.",
      updated_orders: updatedOrders,
      failed_orders: failedOrders,
      pickup_location,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update pickup location.",
    });
  }
};

module.exports = updatePickupLocation;