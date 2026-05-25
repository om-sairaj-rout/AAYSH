const Order = require("../../models/upload/order.model");

// ================= UPDATE STATUS + WEIGHT =================
const updateOrderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { weight, courierStatus } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // update basic fields
    order.weight = weight ?? order.weight;
    order.courierStatus = courierStatus;

    if (
      courierStatus === "Booked" &&
      !order.bookedAt
    ) {
      order.bookedAt = new Date();
    }

    if (
      courierStatus === "Delivered" &&
      !order.deliveryDate
    ) {
      order.deliveryDate = new Date();
    }

    const updated = await order.save();

    return res.json({
      success: true,
      order: updated,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = 
  updateOrderStatusController;