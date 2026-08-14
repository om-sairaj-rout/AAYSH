const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { COMPANY_ROLES } = require("../../constants/permissions");
const {
  canManageCompanyUsers,
  resolvePermissions,
  sanitizePermissionsInput,
} = require("../../utils/permissions");
const { mapUserResponse } = require("../../utils/companyUsers");

const assertCanManageTargetCompany = (req, companyID) => {
  if (req.user.role === "admin") return true;
  if (req.user.companyID !== companyID) return false;
  return canManageCompanyUsers(req.user);
};

const updateCompanyUser = async (req, res) => {
  try {
    const { companyID, userId } = req.params;
    const { fullName, companyRole, isOwner, permissions, showWeight } = req.body;

    if (!assertCanManageTargetCompany(req, companyID)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update users for this company",
      });
    }

    const user = await User.findOne({ _id: userId, companyID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this company",
      });
    }

    if (user._id.toString() === req.user.id && companyRole && companyRole !== "owner") {
      const ownerCount = await User.countDocuments({
        companyID,
        companyRole: "owner",
      });
      if (ownerCount === 1 && user.companyRole === "owner") {
        return res.status(400).json({
          message: "Assign another owner before changing your owner role",
        });
      }
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (showWeight !== undefined) user.showWeight = showWeight;

    let nextRole = user.companyRole;
    if (isOwner) {
      nextRole = "owner";
    } else if (companyRole) {
      if (!COMPANY_ROLES.includes(companyRole)) {
        return res.status(400).json({ message: "Invalid company role" });
      }
      nextRole = companyRole;
    }

    if (nextRole === "owner" && user.companyRole !== "owner") {
      const ownerExists = await User.exists({
        companyID,
        companyRole: "owner",
        _id: { $ne: user._id },
      });
      if (ownerExists) {
        return res.status(400).json({
          message: "This company already has an owner",
        });
      }
    }

    user.companyRole = nextRole;

    const sanitizedPermissions = sanitizePermissionsInput(permissions);
    user.permissions = resolvePermissions(nextRole, sanitizedPermissions);

    await user.save();

    if (nextRole === "owner") {
      await Company.findOneAndUpdate({ companyID }, { ownerId: user._id });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: mapUserResponse(user.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = updateCompanyUser;
