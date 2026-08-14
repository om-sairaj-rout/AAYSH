const { getCompanyDetailPayload } = require("../../utils/companyUsers");
const { canManageCompanyUsers } = require("../../utils/permissions");

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

    const isPlatformAdmin = req.user.role === "admin";
    const isSameCompany = req.user.companyID === companyID;

    if (!isPlatformAdmin && !isSameCompany) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    return res.status(200).json({
      success: true,
      ...payload,
      canManageUsers:
        isPlatformAdmin ||
        (isSameCompany && canManageCompanyUsers(req.user)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = getCompanyDetail;
