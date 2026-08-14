const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { toISTDate } = require("../../utils/dateTime");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const { buildDashboardAnalytics } = require("../../utils/dashboardAnalytics");

const getISTYear = (date) => {
  const istDate = toISTDate(date);
  return istDate ? istDate.split("-")[0] : null;
};

const getISTMonthIndex = (date) => {
  const istDate = toISTDate(date);
  return istDate ? Number(istDate.split("-")[1]) - 1 : -1;
};

const getISTDay = (date) => {
  const istDate = toISTDate(date);
  return istDate ? Number(istDate.split("-")[2]) : -1;
};

const filterOrdersByDateRange = (orders, fromDate, toDate) => {
  if (!fromDate && !toDate) return orders;

  return orders.filter((order) => {
    const date = order.orderDate || order.createdAt;
    if (!date) return false;

    const istDate = toISTDate(date);
    if (!istDate) return false;
    if (fromDate && istDate < fromDate) return false;
    if (toDate && istDate > toDate) return false;
    return true;
  });
};

const MONTHS = [
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

const daysInMonth = (year, monthIndex) =>
  new Date(Number(year), monthIndex + 1, 0).getDate();

const getISTWeekdayShort = (year, monthIndex, day) => {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  const date = new Date(`${year}-${month}-${dayStr}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
};

const buildMonthlyChartData = (yearOrders) =>
  MONTHS.map((month, index) => {
    const monthOrders = yearOrders.filter((order) => {
      const date = order.orderDate || order.createdAt;
      return date && getISTMonthIndex(date) === index;
    });

    return {
      name: month,
      orders: monthOrders.length,
      cost: monthOrders.reduce(
        (acc, curr) => acc + Number(curr.invoiceValue || 0),
        0
      ),
    };
  });

const buildWeeklyChartData = (yearOrders, year, monthIndex, weekNumber) => {
  const startDay = (weekNumber - 1) * 7 + 1;
  const maxDay = daysInMonth(year, monthIndex);
  const chartData = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = startDay + offset;

    if (day > maxDay) {
      chartData.push({
        name: "-",
        label: "-",
        orders: 0,
        cost: 0,
      });
      continue;
    }

    const dayOrders = yearOrders.filter((order) => {
      const date = order.orderDate || order.createdAt;
      if (!date) return false;

      return (
        getISTYear(date) === String(year) &&
        getISTMonthIndex(date) === monthIndex &&
        getISTDay(date) === day
      );
    });

    chartData.push({
      name: getISTWeekdayShort(year, monthIndex, day),
      label: `${day} ${MONTHS[monthIndex]}`,
      orders: dayOrders.length,
      cost: dayOrders.reduce(
        (acc, curr) => acc + Number(curr.invoiceValue || 0),
        0
      ),
    });
  }

  return chartData;
};

const getDashboardController = async (req, res) => {
  try {

    const isAdmin = req.user.role === "admin";

    const selectedYear = req.query.year;
    const chartView = req.query.view === "week" ? "week" : "month";
    const selectedMonth = Math.min(
      12,
      Math.max(1, Number(req.query.month) || new Date().getMonth() + 1)
    );
    const selectedWeek = Math.min(
      4,
      Math.max(1, Number(req.query.week) || 1)
    );
    const companyId = String(req.query.companyId || req.query.company_id || "").trim();
    const fromDate = req.query.from || null;
    const toDate = req.query.to || null;

    let filter = {};

    if (isAdmin) {
      if (companyId && companyId !== "ALL") {
        filter.companyID = companyId;
      }
    } else {
      filter = applyCompanyOrderFilter(req, filter);
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

yearOrders = filterOrdersByDateRange(yearOrders, fromDate, toDate);

// =========================
// STATS & TOP CITIES
// Based on selected fiscal year (falls back to all orders)
// =========================

const totalOrders = yearOrders.length;

const pendingOrders = yearOrders.filter(
  o => !o.shipping || o.shipping.shippingStatus === "Pending"
).length;

const bookedOrders = yearOrders.filter(
  o => o.shipping?.shippingStatus === "Booked"
).length;

const shippedOrders = yearOrders.filter(
  o => o.shipping?.shippingStatus === "Shipped"
).length;

const inTransitOrders = yearOrders.filter(
  o =>
    o.shipping?.shippingStatus === "In Transit" ||
    o.shipping?.shippingStatus === "Out For Delivery"
).length;

const deliveredOrders = yearOrders.filter(
  o => o.shipping?.shippingStatus === "Delivered"
).length;

const delayedOrders = yearOrders.filter(
  o => o.shipping?.shippingStatus === "Delayed"
).length;

const cancelledOrders = yearOrders.filter(
  o => o.shipping?.shippingStatus === "Cancelled"
).length;

const rtoOrders = yearOrders.filter(
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

    const chartData =
      chartView === "week"
        ? buildWeeklyChartData(
            yearOrders,
            selectedYear || new Date().getFullYear(),
            selectedMonth - 1,
            selectedWeek
          )
        : buildMonthlyChartData(yearOrders);

    const cityMap = {};

    yearOrders.forEach((order) => {
      const city = order.destinationCity || "Unknown";

      if (!cityMap[city]) {
        cityMap[city] = {
          city,
          orders: 0,
          cost: 0,
        };
      }

      cityMap[city].orders += 1;
      cityMap[city].cost += Number(order.invoiceValue || 0);
    });

    const topCities = Object.values(cityMap)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 20);

    const { salesAnalytics, shipmentAnalytics, riskAnalytics } =
      buildDashboardAnalytics(yearOrders);

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
      chartView,
      chartMeta:
        chartView === "week"
          ? {
              month: selectedMonth,
              week: selectedWeek,
              monthName: MONTHS[selectedMonth - 1],
            }
          : null,

      topCities,

      salesAnalytics,
      shipmentAnalytics,
      riskAnalytics,

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