const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const getDashboardController = async (req, res) => {
  try {

    const isAdmin = req.user.role === "admin";

    const selectedYear = req.query.year;

    let filter = {};

    if (!isAdmin) {
      filter.uploadedBy = req.user.id;
    }

    let orders = await Order.find(filter).lean();

const orderIds = orders.map(order => order._id);

const shippingList = await Shipping.find({
  orderId: { $in: orderIds }
}).lean();

const shippingMap = {};

shippingList.forEach(shipping => {
  shippingMap[shipping.orderId.toString()] = shipping;
});

orders = orders.map(order => ({
  ...order,
  shipping: shippingMap[order._id.toString()] || {
    shippingStatus: "Pending"
  }
}));

    // =========================
    // YEAR FILTER
    // =========================
    if (selectedYear) {
  orders = orders.filter((order) => {
    if (!order.orderDate) return false;

    return (
      new Date(order.orderDate).getFullYear().toString() === selectedYear
    );
  });
}

    // =========================
    // STATS
    // =========================

const totalOrders = orders.length;

const pendingOrders = orders.filter(
  o => !o.shipping || o.shipping.shippingStatus === "Pending"
).length;

const bookedOrders = orders.filter(
  o => o.shipping?.shippingStatus === "Booked"
).length;

const shippedOrders = orders.filter(
  o => o.shipping?.shippingStatus === "Shipped"
).length;

const inTransitOrders = orders.filter(
  o =>
    o.shipping?.shippingStatus === "In Transit" ||
    o.shipping?.shippingStatus === "Out For Delivery"
).length;

const deliveredOrders = orders.filter(
  o => o.shipping?.shippingStatus === "Delivered"
).length;

const delayedOrders = orders.filter(
  o => o.shipping?.shippingStatus === "Delayed"
).length;

const cancelledOrders = orders.filter(
  o => o.shipping?.shippingStatus === "Cancelled"
).length;

const rtoOrders = orders.filter(
  o => o.shipping?.shippingStatus === "RTO"
).length;

const totalCost = orders.reduce(
  (sum, order) => sum + Number(order.invoiceValue || 0),
  0
);

    // =========================
    // CHART DATA
    // =========================

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const chartData = months.map((month, index) => {

      const monthOrders = orders.filter(
  (o) =>
    o.orderDate &&
    new Date(o.orderDate).getMonth() === index
);

      return {
        name: month,
        orders: monthOrders.length,
        cost: monthOrders.reduce(
          (acc, curr) =>
            acc + Number(curr.invoiceValue || 0),
          0
        ),
      };

    });

    // =========================
    // TOP CITIES
    // =========================

    const cityMap = {};

    orders.forEach((o) => {

      const city =
        o.destinationCity || "Unknown";

      if (!cityMap[city]) {

        cityMap[city] = {
          city,
          orders: 0,
          cost: 0,
        };

      }

      cityMap[city].orders += 1;
      cityMap[city].cost += Number(
        o.invoiceValue || 0
      );

    });

    const topCities = Object.values(cityMap)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 20);

    return res.status(200).json({
      success: true,

      stats: {
  totalOrders,
  pendingOrders,
  bookedOrders,
  shippedOrders,
  inTransitOrders,
  deliveredOrders,
  delayedOrders,
  cancelledOrders,
  rtoOrders,
},

      chartData,

      topCities,

      totalCost,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = getDashboardController;