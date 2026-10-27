require("dotenv").config();
const mongoose = require("mongoose");
const {
  paginateMergedPickupPage,
  countShipmentTabs,
  addScheduleCounts,
  countSchedulesByPickupTabs,
} = require("../utils/adminPickupPaginate");

const tabs = ["today", "scheduled", "future", "failed", "completed", "all"];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const countsStart = Date.now();
  const [shipmentCounts, scheduleCounts] = await Promise.all([
    countShipmentTabs(null),
    countSchedulesByPickupTabs({}),
  ]);
  addScheduleCounts(shipmentCounts, scheduleCounts);
  const countsMs = Date.now() - countsStart;

  console.log(`Tab counts (shipments + schedules): ${countsMs}ms`);
  console.log(shipmentCounts);

  for (const tab of tabs) {
    const started = Date.now();
    const { data, total } = await paginateMergedPickupPage({
      tab,
      companyFilterId: null,
      searchTerm: "",
      skip: 0,
      perPage: 20,
      scheduleScope: {},
    });
    console.log(
      `tab=${tab} page=1 rows=${data.length} total=${total} ${Date.now() - started}ms`
    );
  }

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
