const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { canManageCompanyUsers } = require("../../utils/permissions");

const assertCanManageTargetCompany = (req, companyID) => {
  if (req.user.role === "admin") return true;
  if (req.user.companyID !== companyID) return false;
  return canManageCompanyUsers(req.user);
};

const deleteCompanyUser = async (req, res) => {
  try {
    const { companyID, userId } = req.params;

    if (!assertCanManageTargetCompany(req, companyID)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to remove users for this company",
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        message: "You cannot remove your own account from here",
      });
    }

    const user = await User.findOne({ _id: userId, companyID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this company",
      });
    }

    if (user.companyRole === "owner") {
      return res.status(400).json({
        message: "Cannot remove the company owner. Transfer ownership first.",
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: "User removed from company",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = deleteCompanyUser;
