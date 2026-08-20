const Company = require("../../models/company.model");
const User = require("../../models/user.model");

const resolveCompanyOwner = (company, users = []) => {
  const companyUsers = users.filter((user) => user.companyID === company.companyID);

  return (
    companyUsers.find(
      (user) =>
        company.ownerId &&
        String(user._id) === String(company.ownerId)
    ) ||
    companyUsers.find((user) => user.companyRole === "owner") ||
    companyUsers[0] ||
    null
  );
};

const resolveCompanyConsignorPhone = (company, users = []) => {
  const owner = resolveCompanyOwner(company, users);
  return String(owner?.mobile_number || "").trim();
};

const buildConsignorContacts = (company, users = []) => {
  const companyUsers = users.filter((user) => user.companyID === company.companyID);

  return companyUsers.map((user) => ({
    name: String(user.fullName || user.companyName || company.companyName || "").trim(),
    companyName: String(user.companyName || company.companyName || "").trim(),
    phone: String(user.mobile_number || "").trim(),
    role: user.companyRole || "",
  }));
};

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).lean();

    const companyIds = companies.map((company) => company.companyID);
    const users = await User.find({ companyID: { $in: companyIds } })
      .select("companyID mobile_number companyRole fullName companyName")
      .lean();

    const userCounts = await User.aggregate([
      { $match: { companyID: { $in: companyIds } } },
      { $group: { _id: "$companyID", count: { $sum: 1 } } },
    ]);

    const countMap = userCounts.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      companies: companies.map((company) => {
        const owner = resolveCompanyOwner(company, users);
        const consignorContacts = buildConsignorContacts(company, users);

        return {
          ...company,
          consignorName: String(company.companyName || "").trim(),
          consignorPhone: resolveCompanyConsignorPhone(company, users),
          consignorContacts,
          ownerName: String(owner?.fullName || company.companyName || "").trim(),
          userCount: countMap[company.companyID] || 0,
        };
      }),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = getCompanies;
