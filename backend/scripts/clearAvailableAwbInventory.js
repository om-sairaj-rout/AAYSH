/**
 * Deletes all AWB inventory rows with status "available" (unassigned stock).
 * Does not modify booked AWBs or shipment history.
 *
 * Usage: node scripts/clearAvailableAwbInventory.js
 * Optional: DRY_RUN=1 to print counts only.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Awb = require("../models/awb/awb.model");
const { AWB_CATEGORY_ENUM } = require("../constants/awbCategories");

const run = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGODB_URI or MONGO_URI is required.");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const filter = { status: "available" };
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  const byCategory = await Awb.aggregate([
    { $match: filter },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const total = byCategory.reduce((sum, row) => sum + row.count, 0);
  const bookedCount = await Awb.countDocuments({ status: "booked" });

  console.log("Available AWB inventory by category (to remove):");
  for (const cat of AWB_CATEGORY_ENUM) {
    const row = byCategory.find((r) => r._id === cat);
    console.log(`  ${cat}: ${row?.count || 0}`);
  }
  const legacyOrOther = byCategory.filter(
    (r) => !AWB_CATEGORY_ENUM.includes(r._id)
  );
  for (const row of legacyOrOther) {
    console.log(`  ${row._id}: ${row.count}`);
  }
  console.log(`Total available to delete: ${total}`);
  console.log(`Booked AWBs (preserved): ${bookedCount}`);

  if (dryRun) {
    console.log("DRY_RUN — no documents deleted.");
    await mongoose.disconnect();
    return;
  }

  const result = await Awb.deleteMany(filter);
  const remainingAvailable = await Awb.countDocuments({ status: "available" });

  console.log(`Deleted ${result.deletedCount} available AWB document(s).`);
  console.log(`Remaining available AWBs: ${remainingAvailable}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
