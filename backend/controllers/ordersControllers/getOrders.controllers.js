const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const getOrdersController = async (req, res) => {
  try {
    const { status } = req.query;

    const isAdmin = req.user.role === "admin";

    let filter = {};

    // =========================
    // ROLE FILTER
    // =========================
    if (!isAdmin) {
      filter.uploadedBy = req.user.id;
    }

    // =========================
    // STATUS FILTER
    // =========================
    const statusMap = {
      "All Orders": null,
      "Not Shipped": "Not Shipped",
      "Booked": "Booked",
      "Shipped": "Shipped",
      "In Transit": "In Transit",
      "Out For Delivery": "Out For Delivery",
      "Delivered": "Delivered",
      "Cancelled": "Cancelled",
      "Delayed": "Delayed",
      "RTO": "RTO",
    };

    const mappedStatus = statusMap[status];

    if (mappedStatus) {
      filter.courierStatus = mappedStatus;
    }

    // =========================
    // FETCH ORDERS
    // =========================
    const orders = await Order.find(filter)
      .sort({ pickupDate: 1 })
      .lean();

    // =========================
    // ATTACH SHIPPING DETAILS
    // =========================
    const finalOrders = await Promise.all(
      orders.map(async (order) => {
        const shipping = await Shipping.findOne({
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

module.exports = getOrdersController;