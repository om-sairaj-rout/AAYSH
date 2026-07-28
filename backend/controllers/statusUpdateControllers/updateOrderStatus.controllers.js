const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");

const updateOrderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      weight,
      status,
      location,
      remarks,
    } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update weight if changed
    if (weight !== undefined) {
      order.weight = weight;
      await order.save();
    }

    // Shipping record
    let shipping = await Shipping.findOne({
      orderId,
    });

    if (!shipping) {
      shipping = await Shipping.create({
        orderId,
      });
    }

    // Update shipping status
    shipping.shippingStatus = status;

    switch (status) {
      case "Booked":
        if (!shipping.bookedAt)
          shipping.bookedAt = new Date();
        break;

      case "Shipped":
        if (!shipping.shippedAt)
          shipping.shippedAt = new Date();
        break;

      case "Out For Delivery":
        if (!shipping.outForDeliveryAt)
          shipping.outForDeliveryAt = new Date();
        break;

      case "Delivered":
        if (!shipping.deliveredAt)
          shipping.deliveredAt = new Date();
        break;
    }

    await shipping.save();

    // Dashboard status
    order.courierStatus = status = status;
    await order.save();

    // Tracking history
    await Tracking.create({
      shippingId: shipping._id,
      status,
      location,
      remarks,
      updatedBy: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: "Status updated successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = updateOrderStatusController;