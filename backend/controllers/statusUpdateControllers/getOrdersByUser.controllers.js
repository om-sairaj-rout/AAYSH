const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

// ================= GET ORDERS BY USER =================
const getOrdersByUserController = async (req, res) => {
  try {

    const { userId } = req.params;

    const orders = await Order.find({
      uploadedBy: userId,
    })
      .sort({ pickupDate: -1 })
      .lean();

    const finalOrders = await Promise.all(
      orders.map(async (order) => {

        const shipping =
          await Shipping.findOne({
            orderId: order._id,
          }).lean();

        return {
          ...order,
          shipping,
        };

      })
    );

    return res.json({
      success: true,
      orders: finalOrders,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = getOrdersByUserController;