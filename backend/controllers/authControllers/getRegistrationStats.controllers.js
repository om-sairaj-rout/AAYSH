const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { getCompanyDetailPayload } = require("../../utils/companyUsers");
const { resolvePermissions } = require("../../utils/permissions");

const buildCompaniesFallback = async (users) => {
  const companyUsers = users.filter(
    (user) => user.role === "user" && user.companyID
  );

  const groups = new Map();
  for (const user of companyUsers) {
    if (!groups.has(user.companyID)) {
      groups.set(user.companyID, []);
    }
    groups.get(user.companyID).push(user);
  }

  const companies = [];

  for (const [companyID, members] of groups.entries()) {
    const firstUser = members[0];
    const owner =
      members.find((member) => member.companyRole === "owner") || firstUser;

    companies.push({
      companyID,
      companyName: firstUser.companyName,
      address: firstUser.address,
      city: firstUser.city,
      state: firstUser.state,
      country: firstUser.country,
      createdAt: firstUser.createdAt,
      owner: {
        _id: owner._id,
        fullName: owner.fullName,
        email: owner.email,
        companyRole: owner.companyRole || "owner",
      },
      stats: {
        totalUsers: members.length,
        owners: members.filter((member) => member.companyRole === "owner").length,
        managers: members.filter((member) => member.companyRole === "manager").length,
        operators: members.filter((member) => member.companyRole === "operator").length,
        viewers: members.filter((member) => member.companyRole === "viewer").length,
      },
      isLegacyPreview: true,
    });
  }

  return companies.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

const getRegistrationStats = async (req, res) => {
  try {
    const [totalUsers, adminUsers, companyUsers, companyIds, recentUsers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "user" }),
        User.distinct("companyID", {
          companyID: { $exists: true, $nin: ["", null] },
        }),
        User.find()
          .select("-password")
          .sort({ createdAt: -1 })
          .lean(),
      ]);

    let companies = await Company.find().sort({ createdAt: -1 }).lean();
    let needsMigration = false;

    if (companies.length === 0) {
      const fallback = await buildCompaniesFallback(recentUsers);
      if (fallback.length > 0) {
        companies = fallback;
      } else {
        needsMigration = true;
      }
    } else {
      companies = await Promise.all(
        companies.map(async (company) => {
          const payload = await getCompanyDetailPayload(company.companyID);
          return {
            ...company,
            stats: payload?.stats || { totalUsers: 0 },
            owner: payload?.owner || null,
          };
        })
      );
    }

    const usersWithoutCompanyId = recentUsers.filter(
      (user) => user.role === "user" && !user.companyID
    ).length;

    const totalCompanies =
      companies.length > 0 ? companies.length : companyIds.length;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCompanies,
        adminUsers,
        companyUsers,
        usersWithoutCompanyId,
        needsMigration,
      },
      companies,
      users: recentUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getRegistrationStats;
