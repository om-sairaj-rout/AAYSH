const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const getOrdersController = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      status,
      from,
      to,
      search,
      payment_method,
      pickup_location,
      courier_name,
    } = req.query;

    const orderFilter = {};

    // =========================
    // USER FILTER
    // =========================
    if (!isAdmin) {
      orderFilter.uploadedBy = req.user.id;
    }

    // =========================
    // DATE FILTER
    // =========================
    if (from || to) {
      orderFilter.orderDate = {};

      if (from) {
        orderFilter.orderDate.$gte = new Date(from);
      }

      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        orderFilter.orderDate.$lte = end;
      }
    }

    // =========================
    // PAYMENT FILTER
    // =========================
    if (payment_method) {
      orderFilter.paymentMethod = payment_method;
    }

    // =========================
    // SEARCH
    // =========================
    if (search) {
      const shippingOrders = await Shipping.find({
        awbNumber: {
          $regex: search,
          $options: "i",
        },
      }).select("orderId");

      orderFilter.$or = [
        {
          externalOrderId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          consigneeName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          consigneeLastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          billingPhone: {
            $regex: search,
            $options: "i",
          },
        },
        {
          _id: {
            $in: shippingOrders.map((x) => x.orderId),
          },
        },
      ];
    }

    // =========================
    // FETCH ORDERS
    // =========================
    const orders = await Order.find(orderFilter)
      .sort({ pickupDate: -1 })
      .lean();

    const finalOrders = [];

    const statusCounts = {
      "All Orders": 0,
    };

    for (const order of orders) {
      const shipping = await Shipping.findOne({
        orderId: order._id,
      }).lean();

      const shippingData =
        shipping || {
          shippingStatus: "Pending",
        };

      const shippingStatus =
        shippingData.shippingStatus || "Pending";

      // Count every status
      statusCounts["All Orders"]++;

      statusCounts[shippingStatus] =
        (statusCounts[shippingStatus] || 0) + 1;

     finalOrders.push({
  ...order,
  shipping: shippingData,
});

      if (
        pickup_location &&
        shippingData.pickupLocation !== pickup_location
      ) {
        continue;
      }

      if (
        courier_name &&
        shippingData.courierName?.toLowerCase() !==
          courier_name.toLowerCase()
      ) {
        continue;
      }

      finalOrders.push({
        ...order,
        shipping: shippingData,
      });
    }

    return res.status(200).json({
      success: true,
      orders: finalOrders,
      counts: statusCounts,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getOrdersController;