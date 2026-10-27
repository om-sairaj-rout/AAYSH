require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const { fetchDashboardYearOrders } = require("../utils/dashboardStatsAggregate");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const filter = {};

  const legacyStart = Date.now();
  const orders = await Order.find(filter).lean();
  const orderIds = orders.map((o) => o._id);
  await Shipping.find({ orderId: { $in: orderIds } }).lean();
  const legacyMs = Date.now() - legacyStart;

  const aggStart = Date.now();
  const aggregated = await fetchDashboardYearOrders(filter, null, null, null);
  const aggMs = Date.now() - aggStart;

  console.log(`Orders in scope: ${orders.length}`);
  console.log(`Legacy (Order.find + Shipping.find $in): ${legacyMs}ms`);
  console.log(`Aggregation (lookup in pipeline): ${aggMs}ms`);

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
