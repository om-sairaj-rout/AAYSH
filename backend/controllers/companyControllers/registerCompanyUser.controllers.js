const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { COMPANY_ROLES } = require("../../constants/permissions");
const {
  canManageCompanyUsers,
  resolvePermissions,
  sanitizePermissionsInput,
  getFullManagedAdminPermissions,
  isAdminCreatingOwnCompanyUser,
  isUnrestrictedAdmin,
} = require("../../utils/permissions");
const { mapUserResponse } = require("../../utils/companyUsers");
const { respondWithError } = require("../../utils/mongoErrors");

const assertCanManageTargetCompany = (req, companyID) => {
  if (isUnrestrictedAdmin(req.user)) return true;
  if (req.user.companyID !== companyID) return false;
  return canManageCompanyUsers(req.user);
};

const registerCompanyUser = async (req, res) => {
  try {
    const { companyID } = req.params;
    const {
      fullName,
      email,
      password,
      mobile_number,
      companyRole = "operator",
      isOwner = false,
      permissions,
      address,
      zip_code,
      city,
      state,
      country,
    } = req.body;

    if (!assertCanManageTargetCompany(req, companyID)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add users for this company",
      });
    }

    const company = await Company.findOne({ companyID });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    if (!mobile_number) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile_number }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "A user already exists with this email or mobile number",
      });
    }

    let resolvedCompanyRole = companyRole;
    if (isOwner) {
      resolvedCompanyRole = "owner";
    }

    if (!COMPANY_ROLES.includes(resolvedCompanyRole)) {
      return res.status(400).json({ message: "Invalid company role" });
    }

    if (resolvedCompanyRole === "owner") {
      const ownerExists = await User.exists({
        companyID,
        companyRole: "owner",
      });

      if (ownerExists) {
        return res.status(400).json({
          message:
            "This company already has an owner. Transfer ownership before assigning another owner.",
        });
      }
    }

    const createAsManagedAdmin = isAdminCreatingOwnCompanyUser(req.user, companyID);

    const sanitizedPermissions = sanitizePermissionsInput(
      permissions ||
        (createAsManagedAdmin ? getFullManagedAdminPermissions() : {})
    );
    const resolvedPermissions = resolvePermissions(
      resolvedCompanyRole,
      sanitizedPermissions,
      { permissionsManaged: createAsManagedAdmin }
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      companyID: company.companyID,
      companyName: company.companyName,
      fullName: String(fullName || "").trim(),
      email,
      password: hashedPassword,
      mobile_number,
      address: address || company.address,
      zip_code: zip_code || company.zip_code,
      city: city || company.city,
      state: state || company.state,
      country: country || company.country,
      website: company.website,
      gstin: company.gstin,
      logo: company.logo,
      role: createAsManagedAdmin ? "admin" : "user",
      companyRole: resolvedCompanyRole,
      permissions: resolvedPermissions,
      permissionsManaged: createAsManagedAdmin,
    });

    if (resolvedCompanyRole === "owner") {
      company.ownerId = newUser._id;
      await company.save();
    }

    return res.status(201).json({
      success: true,
      message: "Company user registered successfully",
      user: mapUserResponse(newUser.toObject()),
    });
  } catch (error) {
    console.error("REGISTER COMPANY USER ERROR:", error);
    return respondWithError(res, error, {
      fallback: "Failed to register company user. Please try again.",
    });
  }
};

module.exports = registerCompanyUser;
