/**
 * Backfill companyID for existing users and orders.
 * Run: node scripts/backfillCompanyIds.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Order = require("../models/upload/order.model");
const UploadHistory = require("../models/upload/uploadHistory.model");
const { generateCompanyId } = require("../utils/generateCompanyId");

const run = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI is required");
  }

  await mongoose.connect(mongoUri);

  const usersWithoutId = await User.find({
    $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
  });

  for (const user of usersWithoutId) {
    user.companyID = await generateCompanyId();
    await user.save();
    console.log(`Assigned ${user.companyID} to ${user.companyName}`);
  }

  const users = await User.find({ companyID: { $exists: true, $ne: "" } })
    .select("_id companyID")
    .lean();

  const companyByUserId = new Map(
    users.map((user) => [String(user._id), user.companyID])
  );

  const orders = await Order.find({
    $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
  }).select("_id uploadedBy");

  for (const order of orders) {
    const companyID = companyByUserId.get(String(order.uploadedBy));
    if (!companyID) continue;

    await Order.updateOne({ _id: order._id }, { $set: { companyID } });
  }

  console.log(`Updated ${orders.length} orders with companyID`);

  const histories = await UploadHistory.find({
    $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
  }).select("_id uploadedBy");

  for (const history of histories) {
    const companyID = companyByUserId.get(String(history.uploadedBy));
    if (!companyID) continue;

    await UploadHistory.updateOne({ _id: history._id }, { $set: { companyID } });
  }

  console.log(`Updated ${histories.length} upload history records with companyID`);
  console.log("Backfill complete");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
