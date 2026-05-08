const Order = require("../../models/upload/order.model");

const getDashboardController = async (req, res) => {

  try {

    const isAdmin = req.user.role === "admin";
    const selectedYear = req.query.year;

    let filter = {};

    if (!isAdmin) {
      filter.uploadedBy = req.user.id;
    }

    let orders = await Order.find(filter);

    // FILTER BY YEAR
    if (selectedYear) {

      orders = orders.filter((order) => {

        if (!order.orderDate) return false;

        const orderYear = new Date(order.orderDate)
          .getFullYear()
          .toString();

        return orderYear === selectedYear;
      });
    }

    // TOTAL STATS
    const totalOrders = orders.length;

    const deliveredOrders = orders.filter(
      (o) => (o.status || "").toLowerCase() === "delivered"
    ).length;

    const inTransitOrders = orders.filter((o) => {
      const status = (o.status || "").toLowerCase();
      return status === "in transit" || status === "shipped";
    }).length;

    const delayedOrders = orders.filter((o) => {
      const status = (o.status || "").toLowerCase();
      return status === "delayed" || status === "rto";
    }).length;

    // MONTHLY DATA
    const monthOrder = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const monthlyMap = {};

    monthOrder.forEach((month) => {
      monthlyMap[month] = {
        name: month,
        orders: 0,
        cost: 0
      };
    });

    orders.forEach((order) => {

      if (!order.orderDate) return;

      const date = new Date(order.orderDate);
      if (isNaN(date)) return;

      const month = date.toLocaleString("default", {
        month: "short"
      });

      if (monthlyMap[month]) {

        monthlyMap[month].orders += 1;

        monthlyMap[month].cost += Number(order.deliveryCharge || 0);
      }
    });

    const chartData = Object.values(monthlyMap);

    // 🔥 TOP CITIES (FIXED)
    const cityMap = {};

    orders.forEach((order) => {

      const city = order.destinationCity || "Unknown";

      if (!cityMap[city]) {
        cityMap[city] = {
          city,
          orders: 0,
          cost: 0
        };
      }

      cityMap[city].orders += 1;

      cityMap[city].cost += Number(order.deliveryCharge || 0);
    });

    const topCities = Object.values(cityMap)
      .sort((a, b) => b.orders - a.orders);

    // TOTAL COST
    const totalCost = orders.reduce(
      (acc, curr) => acc + Number(curr.deliveryCharge || 0),
      0
    );

    return res.status(200).json({
      success: true,

      stats: {
        totalOrders,
        deliveredOrders,
        inTransitOrders,
        delayedOrders
      },

      chartData,
      topCities,
      totalCost
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

module.exports = getDashboardController;