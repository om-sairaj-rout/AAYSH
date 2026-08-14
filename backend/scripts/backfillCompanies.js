/**
 * Backfill Company documents and companyRole for existing users.
 * Run: node backend/scripts/backfillCompanies.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectToDB = require("../config/db");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const { resolvePermissions } = require("../utils/permissions");

const backfillCompanies = async () => {
  await connectToDB();

  const users = await User.find({ companyID: { $nin: ["", null] } }).sort({
    createdAt: 1,
  });

  const companyMap = new Map();

  for (const user of users) {
    if (!companyMap.has(user.companyID)) {
      companyMap.set(user.companyID, user);
    }
  }

  for (const [companyID, firstUser] of companyMap.entries()) {
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
      console.log(`Created company ${companyID}`);
    }

    const companyUsers = await User.find({ companyID }).sort({ createdAt: 1 });
    let ownerAssigned = await User.exists({
      companyID,
      companyRole: "owner",
    });

    for (const companyUser of companyUsers) {
      let changed = false;

      if (!companyUser.companyRole) {
        if (!ownerAssigned) {
          companyUser.companyRole = "owner";
          ownerAssigned = true;
          company.ownerId = companyUser._id;
        } else {
          companyUser.companyRole = "operator";
        }
        changed = true;
      }

      if (!companyUser.permissions || companyUser.permissions.size === 0) {
        companyUser.permissions = resolvePermissions(companyUser.companyRole, {});
        changed = true;
      }

      if (changed) {
        await companyUser.save();
        console.log(`Updated user ${companyUser.email} (${companyUser.companyRole})`);
      }
    }

    await company.save();
  }

  console.log("Company backfill complete.");
  await mongoose.connection.close();
};

backfillCompanies().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
