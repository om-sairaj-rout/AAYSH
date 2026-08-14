const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { toISTDate } = require("../../utils/dateTime");

const getISTYear = (date) => {
  const istDate = toISTDate(date);
  return istDate ? istDate.split("-")[0] : null;
};

const getISTMonthIndex = (date) => {
  const istDate = toISTDate(date);
  return istDate ? Number(istDate.split("-")[1]) - 1 : -1;
};

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

const allOrders = orders;

// =========================
// YEAR FILTER
// Used only for annual analytics
// =========================
let yearOrders = allOrders;

if (selectedYear) {
  yearOrders = allOrders.filter((order) => {
    const date = order.orderDate || order.createdAt;

    if (!date) return false;

    return getISTYear(date) === selectedYear;
  });
}

// =========================
// STATS
// Based on ALL orders
// =========================

const totalOrders = allOrders.length;

const pendingOrders = allOrders.filter(
  o => !o.shipping || o.shipping.shippingStatus === "Pending"
).length;

const bookedOrders = allOrders.filter(
  o => o.shipping?.shippingStatus === "Booked"
).length;

const shippedOrders = allOrders.filter(
  o => o.shipping?.shippingStatus === "Shipped"
).length;

const inTransitOrders = allOrders.filter(
  o =>
    o.shipping?.shippingStatus === "In Transit" ||
    o.shipping?.shippingStatus === "Out For Delivery"
).length;

const deliveredOrders = allOrders.filter(
  o => o.shipping?.shippingStatus === "Delivered"
).length;

const delayedOrders = allOrders.filter(
  o => o.shipping?.shippingStatus === "Delayed"
).length;

const cancelledOrders = allOrders.filter(
  o => o.shipping?.shippingStatus === "Cancelled"
).length;

const rtoOrders = allOrders.filter(
  o => o.shipping?.shippingStatus === "RTO"
).length;

// Cost is based on selected year
const totalCost = yearOrders.reduce(
  (sum, order) =>
    sum + Number(order.invoiceValue || 0),
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

  const monthOrders = yearOrders.filter((o) => {
    const date = o.orderDate || o.createdAt;

    return date && getISTMonthIndex(date) === index;
  });

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

    allOrders.forEach((o) => {

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