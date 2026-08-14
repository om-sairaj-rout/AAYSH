const Company = require("../../models/company.model");
const User = require("../../models/user.model");

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).lean();

    const companyIds = companies.map((company) => company.companyID);
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
      companies: companies.map((company) => ({
        ...company,
        userCount: countMap[company.companyID] || 0,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = getCompanies;
