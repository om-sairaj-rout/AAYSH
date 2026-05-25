const Order = require("../../models/upload/order.model");

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
    // STATUS FILTER (CLEAN VERSION)
    // =========================
    const statusMap = {
      "All Orders": null,
      "Not Shipped": "Not Shipped",
      "Booked": "Booked",
      "Cancelled": "Cancelled",
      "In Transit": "In Transit",
      "Delivered": "Delivered",
    };

    const mappedStatus = statusMap[status];

    if (mappedStatus) {
      filter.courierStatus = mappedStatus;
    }


    // =========================
    // FETCH ORDERS (ASC ORDER)
    // =========================
    const orders = await Order.find(filter).sort({ pickupDate: 1 });

    return res.json({
      success: true,
      orders,
    });


  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getOrdersController;