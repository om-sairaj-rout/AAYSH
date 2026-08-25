const { getCompanyDetailPayload } = require("../../utils/companyUsers");
const { canManageCompanyUsers, isUnrestrictedAdmin } = require("../../utils/permissions");

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

    if (!isUnrestrictedAdmin(req.user) && !isSameCompany) {
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
