const { getCompanyDetailPayload } = require("../../utils/companyUsers");
const {
  canManageCompanyUsers,
  isUnrestrictedAdmin,
  userCanAccess,
} = require("../../utils/permissions");

const getCompanyDetail = async (req, res) => {
  try {
    const { companyID } = req.params;
    const payload = await getCompanyDetailPayload(companyID);

    if (!payload) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const isSameCompany = req.user.companyID === companyID;
    const canViewAllCompanies =
      isUnrestrictedAdmin(req.user) ||
      userCanAccess(req.user, "companies", "read");

    if (!canViewAllCompanies && !isSameCompany) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    return res.status(200).json({
      success: true,
      ...payload,
      canManageUsers:
        isUnrestrictedAdmin(req.user) ||
        (isSameCompany && canManageCompanyUsers(req.user)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = getCompanyDetail;
