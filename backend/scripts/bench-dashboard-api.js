require("dotenv").config();
const mongoose = require("mongoose");
const {
  fetchDashboardYearOrders,
  buildStatsFromOrders,
} = require("../utils/dashboardStatsAggregate");
const { buildDashboardAnalytics } = require("../utils/dashboardAnalytics");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const filter = {};
  const year = String(new Date().getFullYear());

  const coldStart = Date.now();
  const orders = await fetchDashboardYearOrders(filter, year, null, null);
  const fetchMs = Date.now() - coldStart;

  const statsStart = Date.now();
  buildStatsFromOrders(orders);
  buildDashboardAnalytics(orders, { lightweight: true });
  const statsMs = Date.now() - statsStart;

  console.log(`Year ${year} orders in scope: ${orders.length}`);
  console.log(`fetchDashboardYearOrders: ${fetchMs}ms`);
  console.log(`stats + analytics build: ${statsMs}ms`);
  console.log(`total backend work: ${fetchMs + statsMs}ms`);

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
