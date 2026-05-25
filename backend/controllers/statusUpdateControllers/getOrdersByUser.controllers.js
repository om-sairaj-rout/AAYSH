const Order = require("../../models/upload/order.model");

// ================= GET ORDERS BY USER =================
const getOrdersByUserController = async (req, res) => {
  try {

    const { userId } = req.params;

    const orders = await Order.find({
      uploadedBy: userId
    }).sort({ pickupDate: -1 });

    return res.json({
      success: true,
      orders
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = 
  getOrdersByUserController;