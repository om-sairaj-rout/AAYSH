const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const Order = require("../../models/upload/order.model");
const UploadHistory = require("../../models/upload/uploadHistory.model");
const { generateCompanyId } = require("../../utils/generateCompanyId");
const { resolvePermissions } = require("../../utils/permissions");

const isMissingCompanyId = (value) =>
  value === undefined || value === null || value === "";

const migrateLegacyCompanies = async () => {
  const companyUsers = await User.find({ role: "user" }).sort({ createdAt: 1 });

  let usersUpdated = 0;
  for (const user of companyUsers) {
    if (isMissingCompanyId(user.companyID)) {
      user.companyID = await generateCompanyId();
      await user.save();
      usersUpdated += 1;
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

  let companiesCreated = 0;

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
      companiesCreated += 1;
    }

    const members = await User.find({ companyID }).sort({ createdAt: 1 });
    let ownerAssigned = await User.exists({ companyID, companyRole: "owner" });

    for (const member of members) {
      let changed = false;

      if (!member.companyRole) {
        if (!ownerAssigned) {
          member.companyRole = "owner";
          ownerAssigned = true;
          company.ownerId = member._id;
        } else {
          member.companyRole = "operator";
        }
        changed = true;
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

  return {
    usersUpdated,
    companiesCreated,
    ordersUpdated,
    historiesUpdated,
    companyCount: await Company.countDocuments(),
    usersStillMissing: await User.countDocuments({
      role: "user",
      $or: [{ companyID: { $exists: false } }, { companyID: "" }, { companyID: null }],
    }),
  };
};

const migrateLegacyCompaniesController = async (req, res) => {
  try {
    const result = await migrateLegacyCompanies();

    return res.status(200).json({
      success: true,
      message: "Legacy company migration completed",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  migrateLegacyCompanies,
  migrateLegacyCompaniesController,
};
