const Order = require("../models/upload/order.model");
const { toISTDate } = require("./dateTime");

const ORDER_FIELDS = {
  orderDate: 1,
  createdAt: 1,
  invoiceValue: 1,
  destinationCity: 1,
  destinationState: 1,
  category: 1,
  paymentMethod: 1,
  companyID: 1,
};

const fetchDashboardOrdersWithShipping = async (filter) => {
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: "shippings",
        let: { orderId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$orderId", "$$orderId"] } } },
          {
            $project: {
              shippingStatus: 1,
              serviceType: 1,
              actualPickupDate: 1,
              pickedUpAt: 1,
            },
          },
          { $limit: 1 },
        ],
        as: "shippingDoc",
      },
    },
    {
      $addFields: {
        shipping: {
          $ifNull: [
            { $arrayElemAt: ["$shippingDoc", 0] },
            { shippingStatus: "Pending" },
          ],
        },
      },
    },
    {
      $project: {
        ...ORDER_FIELDS,
        shipping: 1,
      },
    },
  ];

  return Order.aggregate(pipeline).allowDiskUse(true);
};

const getISTYear = (date) => {
  const istDate = toISTDate(date);
  return istDate ? istDate.split("-")[0] : null;
};

const filterOrdersByYearAndRange = (orders, selectedYear, fromDate, toDate) => {
  let rows = orders;

  if (selectedYear) {
    rows = rows.filter((order) => {
      const date = order.orderDate || order.createdAt;
      return date && getISTYear(date) === String(selectedYear);
    });
  }

  if (fromDate || toDate) {
    rows = rows.filter((order) => {
      const date = order.orderDate || order.createdAt;
      if (!date) return false;
      const istDate = toISTDate(date);
      if (!istDate) return false;
      if (fromDate && istDate < fromDate) return false;
      if (toDate && istDate > toDate) return false;
      return true;
    });
  }

  return rows;
};

module.exports = {
  fetchDashboardOrdersWithShipping,
  filterOrdersByYearAndRange,
};
