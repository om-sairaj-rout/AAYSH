const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const bcrypt = require("bcrypt");
const { generateCompanyId } = require("../../utils/generateCompanyId");
const { resolvePermissions } = require("../../utils/permissions");
const { respondWithError } = require("../../utils/mongoErrors");

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const RegisterController = async (req, res) => {
  try {
    const {
      companyName,
      fullName,
      email,
      password,
      mobile_number,
      website,
      gstin,
      role,
      address,
      zip_code,
      city,
      state,
      country,
      showWeight,
      companyID: joinCompanyID,
      companyRole,
      isOwner,
    } = req.body;

    const trimmedFullName = String(fullName || "").trim();

    if (!trimmedFullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (!companyName || companyName.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Company name must contain at least 3 letters.",
      });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 letters.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile_number }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or mobile number",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isJoiningCompany = Boolean(joinCompanyID);
    let companyRecord = null;
    let resolvedCompanyID = joinCompanyID;
    let resolvedCompanyRole = "owner";

    if (isJoiningCompany) {
      companyRecord = await Company.findOne({ companyID: joinCompanyID });
      if (!companyRecord) {
        return res.status(404).json({
          success: false,
          message: "Company not found for the provided company ID",
        });
      }

      resolvedCompanyRole = isOwner ? "owner" : companyRole || "operator";

      if (resolvedCompanyRole === "owner") {
        const ownerExists = await User.exists({
          companyID: joinCompanyID,
          companyRole: "owner",
        });
        if (ownerExists) {
          return res.status(400).json({
            success: false,
            message: "This company already has an owner assigned",
          });
        }
      }
    } else {
      const trimmedCompanyName = String(companyName).trim();
      const companyNameExists = await Company.findOne({
        companyName: {
          $regex: new RegExp(`^${escapeRegex(trimmedCompanyName)}$`, "i"),
        },
      });

      if (companyNameExists) {
        return res.status(400).json({
          success: false,
          message:
            "Registration not allowed: A company with this name already exists.",
        });
      }

      resolvedCompanyID = await generateCompanyId();
    }

    const permissions = resolvePermissions(resolvedCompanyRole, {});

    let newUser = null;

    try {
      newUser = await User.create({
        companyID: resolvedCompanyID,
        companyName: companyRecord?.companyName || companyName,
        fullName: trimmedFullName,
        email,
        password: hashedPassword,
        mobile_number,
        website: website || companyRecord?.website || "",
        gstin: gstin || companyRecord?.gstin || "",
        role: role || "user",
        companyRole: resolvedCompanyRole,
        permissions,
        address: address || companyRecord?.address || "",
        zip_code: zip_code || companyRecord?.zip_code || "",
        city: city || companyRecord?.city || "",
        state: state || companyRecord?.state || "",
        country: country || companyRecord?.country || "India",
        showWeight,
      });

      if (!isJoiningCompany) {
        companyRecord = await Company.create({
          companyID: resolvedCompanyID,
          companyName: String(companyName).trim(),
          address: address || "",
          zip_code: zip_code || "",
          city: city || "",
          state: state || "",
          country: country || "India",
          website: website || "",
          gstin: gstin || "",
          ownerId: newUser._id,
        });
      } else if (resolvedCompanyRole === "owner") {
        companyRecord.ownerId = newUser._id;
        await companyRecord.save();
      }
    } catch (createError) {
      if (newUser?._id) {
        await User.deleteOne({ _id: newUser._id }).catch(() => {});
      }
      throw createError;
    }

    return res.status(201).json({
      success: true,
      message: isJoiningCompany
        ? "User added to company successfully"
        : "Company and owner registered successfully",
      companyID: newUser.companyID,
      user: {
        id: newUser._id,
        companyID: newUser.companyID,
        companyName: newUser.companyName,
        fullName: newUser.fullName,
        email: newUser.email,
        companyRole: newUser.companyRole,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return respondWithError(res, err, {
      fallback: "Registration failed. Please try again.",
    });
  }
};

module.exports = RegisterController;
