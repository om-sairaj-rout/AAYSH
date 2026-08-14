/**
 * One-time migration for legacy users:
 * 1. Assign companyID to company users missing it
 * 2. Create Company documents
 * 3. Set companyRole + permissions on users
 * 4. Backfill orders/upload history companyID
 *
 * Run from backend folder:
 *   node scripts/migrateLegacyCompanies.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const Order = require("../models/upload/order.model");
const UploadHistory = require("../models/upload/uploadHistory.model");
const { generateCompanyId } = require("../utils/generateCompanyId");
const { resolvePermissions } = require("../utils/permissions");

const isMissingCompanyId = (value) =>
  value === undefined || value === null || value === "";

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required in .env");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to database");

  const companyUsers = await User.find({ role: "user" }).sort({ createdAt: 1 });

  for (const user of companyUsers) {
    if (isMissingCompanyId(user.companyID)) {
      user.companyID = await generateCompanyId();
      await user.save();
      console.log(`Assigned ${user.companyID} to ${user.email}`);
    }
  }

  const usersWithCompany = await User.find({
    role: "user",
    companyID: { $nin: ["", null] },
  }).sort({ createdAt: 1 });

  const companyGroups = new Map();
  for (const user of usersWithCompany) {
    if (!companyGroups.has(user.companyID)) {
      companyGroups.set(user.companyID, user);
    }
  }

  for (const [companyID, firstUser] of companyGroups.entries()) {
    let company = await Company.findOne({ companyID });

    if (!company) {
      company = await Company.create({
        companyID,
        companyName: firstUser.companyName,
        address: firstUser.address || "",
        zip_code: firstUser.zip_code || "",
        city: firstUser.city || "",
        state: firstUser.state || "",
        country: firstUser.country || "India",
        website: firstUser.website || "",
        gstin: firstUser.gstin || "",
        ownerId: firstUser._id,
      });
      console.log(`Created company ${companyID} (${company.companyName})`);
    }

    const members = await User.find({ companyID }).sort({ createdAt: 1 });
    let ownerAssigned = await User.exists({ companyID, companyRole: "owner" });

    for (const member of members) {
      let changed = false;

      if (!member.companyRole || member.companyRole === "owner") {
        if (!ownerAssigned && member._id.toString() === firstUser._id.toString()) {
          member.companyRole = "owner";
          ownerAssigned = true;
          company.ownerId = member._id;
          changed = true;
        } else if (!member.companyRole) {
          member.companyRole = "operator";
          changed = true;
        }
      }

      const permissionSize =
        member.permissions instanceof Map
          ? member.permissions.size
          : Object.keys(member.permissions || {}).length;

      if (!permissionSize) {
        member.permissions = resolvePermissions(member.companyRole, {});
        changed = true;
      }

      if (changed) {
        await member.save();
        console.log(`Updated ${member.email} → ${member.companyRole}`);
      }
    }

    await company.save();
  }

  const userCompanyMap = new Map(
    (
      await User.find({ companyID: { $nin: ["", null] } })
        .select("_id companyID")
        .lean()
    ).map((user) => [String(user._id), user.companyID])
  );

  const orders = await Order.find({
    $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
  }).select("_id uploadedBy");

  let ordersUpdated = 0;
  for (const order of orders) {
    const companyID = userCompanyMap.get(String(order.uploadedBy));
    if (!companyID) continue;
    await Order.updateOne({ _id: order._id }, { $set: { companyID } });
    ordersUpdated += 1;
  }

  const histories = await UploadHistory.find({
    $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
  }).select("_id uploadedBy");

  let historiesUpdated = 0;
  for (const history of histories) {
    const companyID = userCompanyMap.get(String(history.uploadedBy));
    if (!companyID) continue;
    await UploadHistory.updateOne({ _id: history._id }, { $set: { companyID } });
    historiesUpdated += 1;
  }

  const companyCount = await Company.countDocuments();
  const usersStillMissing = await User.countDocuments({
    role: "user",
    $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
  });

  console.log("\nMigration complete.");
  console.log(`Companies in database: ${companyCount}`);
  console.log(`Orders updated: ${ordersUpdated}`);
  console.log(`Upload histories updated: ${historiesUpdated}`);
  console.log(`Company users still missing companyID: ${usersStillMissing}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
