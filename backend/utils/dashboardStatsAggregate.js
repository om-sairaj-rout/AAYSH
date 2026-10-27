const Order = require("../models/upload/order.model");
const { toISTDate } = require("./dateTime");

const statusToStatKey = (status) => {
  const s = status || "Pending";
  if (s === "Pending") return "pendingOrders";
  if (s === "Booked") return "bookedOrders";
  if (s === "Shipped") return "shippedOrders";
  if (s === "In Transit" || s === "Out For Delivery") return "inTransitOrders";
  if (s === "Delivered") return "deliveredOrders";
  if (s === "Delayed") return "delayedOrders";
  if (s === "Cancelled") return "cancelledOrders";
  if (s === "RTO") return "rtoOrders";
  return null;
};

const filterRowByYearRange = (row, selectedYear, fromDate, toDate) => {
  const date = row.orderDate || row.createdAt;
  if (!date) return false;
  const ist = toISTDate(date);
  if (!ist) return false;
  if (selectedYear && ist.split("-")[0] !== String(selectedYear)) return false;
  if (fromDate && ist < fromDate) return false;
  if (toDate && ist > toDate) return false;
  return true;
};

const buildIstDateRangeStages = (selectedYear, fromDate, toDate) => {
  if (!selectedYear && !fromDate && !toDate) {
    return [];
  }

  const istFrom =
    fromDate ||
    (selectedYear ? `${String(selectedYear)}-01-01` : null);
  const istTo =
    toDate ||
    (selectedYear ? `${String(selectedYear)}-12-31` : null);

  return [
    {
      $addFields: {
        istOrderDate: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: { $ifNull: ["$orderDate", "$createdAt"] },
            timezone: "Asia/Kolkata",
          },
        },
      },
    },
    {
      $match: {
        istOrderDate: {
          ...(istFrom ? { $gte: istFrom } : {}),
          ...(istTo ? { $lte: istTo } : {}),
        },
      },
    },
  ];
};

/**
 * Lean aggregation: only fields needed for stats, charts, top cities, analytics.
 */
const buildYearPreFilter = (selectedYear, fromDate, toDate) => {
  if (fromDate || toDate || !selectedYear) {
    return {};
  }
  const y = String(selectedYear);
  const start = new Date(`${y}-01-01T00:00:00+05:30`);
  const end = new Date(`${y}-12-31T23:59:59.999+05:30`);
  return {
    $or: [
      { orderDate: { $gte: start, $lte: end } },
      {
        $and: [
          { $or: [{ orderDate: { $exists: false } }, { orderDate: null }] },
          { createdAt: { $gte: start, $lte: end } },
        ],
      },
    ],
  };
};

const fetchDashboardYearOrders = async (baseFilter, selectedYear, fromDate, toDate) => {
  const pipeline = [
    {
      $match: {
        ...baseFilter,
        ...buildYearPreFilter(selectedYear, fromDate, toDate),
      },
    },
    ...buildIstDateRangeStages(selectedYear, fromDate, toDate),
    {
      $lookup: {
        from: "shippings",
        localField: "_id",
        foreignField: "orderId",
        as: "shippingDoc",
        pipeline: [{ $project: { shippingStatus: 1 } }, { $limit: 1 }],
      },
    },
    {
      $project: {
        orderDate: 1,
        createdAt: 1,
        invoiceValue: 1,
        destinationCity: 1,
        destinationState: 1,
        category: 1,
        paymentMethod: 1,
        shipping: {
          $ifNull: [
            { $arrayElemAt: ["$shippingDoc", 0] },
            { shippingStatus: "Pending" },
          ],
        },
      },
    },
  ];

  const rows = await Order.aggregate(pipeline);

  return rows.filter((row) =>
    filterRowByYearRange(row, selectedYear, fromDate, toDate)
  );
};

const buildStatsFromOrders = (yearOrders) => {
  const stats = {
    totalOrders: yearOrders.length,
    pendingOrders: 0,
    bookedOrders: 0,
    shippedOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    delayedOrders: 0,
    cancelledOrders: 0,
    rtoOrders: 0,
  };

  let totalCost = 0;
  for (const order of yearOrders) {
    totalCost += Number(order.invoiceValue || 0);
    const key = statusToStatKey(order.shipping?.shippingStatus);
    if (key) stats[key] += 1;
    else stats.pendingOrders += 1;
  }

  return { stats, totalCost };
};

module.exports = {
  fetchDashboardYearOrders,
  buildStatsFromOrders,
};
