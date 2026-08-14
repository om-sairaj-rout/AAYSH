const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

// ================= GET ORDERS BY USER =================
const getOrdersByUserController = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // ================= GET USER ORDERS =================
    const orders = await Order.find({
      uploadedBy: userId,
    }).lean();

    const orderIds = orders.map((order) => order._id);

    const shippings = await Shipping.find({
      orderId: { $in: orderIds },
    }).lean();

    const shippingMap = new Map();

    shippings.forEach((shipping) => {
      shippingMap.set(
        String(shipping.orderId),
        shipping
      );
    });

    const finalOrders = orders
      .map((order) => ({
        ...order,
        shipping:
          shippingMap.get(String(order._id)) || null,
      }))
      .sort((a, b) => {
        const dateA = a.shipping?.pickupDate
          ? new Date(a.shipping.pickupDate).getTime()
          : 0;
        const dateB = b.shipping?.pickupDate
          ? new Date(b.shipping.pickupDate).getTime()
          : 0;

        return dateB - dateA;
      });

    // ================= RESPONSE =================
    return res.status(200).json({
      success: true,
      orders: finalOrders,
      count: finalOrders.length,
    });

  } catch (error) {
    console.error("Get Orders By User Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } 
};

module.exports = getOrdersByUserController;