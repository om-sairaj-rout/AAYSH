const User = require("../models/user.model");
const Company = require("../models/company.model");
const { resolvePermissions } = require("./permissions");

const mapUserResponse = (user) => {
  const storedPermissions =
    user.permissions instanceof Map
      ? Object.fromEntries(user.permissions)
      : user.permissions || {};

  const permissions = resolvePermissions(
    user.companyRole,
    storedPermissions,
    { permissionsManaged: user.permissionsManaged }
  );

  return {
    _id: user._id,
    companyID: user.companyID,
    companyName: user.companyName,
    fullName: user.fullName || "",
    email: user.email,
    mobile_number: user.mobile_number,
    role: user.role,
    companyRole: user.companyRole,
    permissions,
    permissionsManaged: Boolean(user.permissionsManaged),
    address: user.address,
    city: user.city,
    state: user.state,
    country: user.country,
    website: user.website,
    gstin: user.gstin,
    showWeight: user.showWeight,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const getCompanyUsers = async (companyID) =>
  User.find({ companyID })
    .select("-password")
    .sort({ companyRole: 1, createdAt: 1 })
    .lean();

const getCompanyDetailPayload = async (companyID) => {
  const users = await getCompanyUsers(companyID);
  if (!users.length) return null;

  let company = await Company.findOne({ companyID }).lean();

  if (!company) {
    const firstUser = users[0];
    const ownerUser =
      users.find((user) => user.companyRole === "owner") || firstUser;

    company = {
      companyID,
      companyName: firstUser.companyName,
      address: firstUser.address || "",
      zip_code: firstUser.zip_code || "",
      city: firstUser.city || "",
      state: firstUser.state || "",
      country: firstUser.country || "India",
      website: firstUser.website || "",
      gstin: firstUser.gstin || "",
      ownerId: ownerUser._id,
      isLegacyPreview: true,
    };
  }

  const owner = users.find(
    (user) =>
      user._id.toString() === String(company.ownerId) ||
      user.companyRole === "owner"
  );

  return {
    company,
    owner: owner ? mapUserResponse(owner) : null,
    users: users.map(mapUserResponse),
    stats: {
      totalUsers: users.length,
      owners: users.filter((user) => user.companyRole === "owner").length,
      managers: users.filter((user) => user.companyRole === "manager").length,
      operators: users.filter((user) => user.companyRole === "operator").length,
      viewers: users.filter((user) => user.companyRole === "viewer").length,
    },
  };
};

module.exports = {
  mapUserResponse,
  getCompanyUsers,
  getCompanyDetailPayload,
};
