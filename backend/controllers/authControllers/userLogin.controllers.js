// controllers/userLogin.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const { resolvePermissions } = require("../../utils/permissions");

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const permissions = resolvePermissions(
      foundUser.companyRole,
      foundUser.permissions instanceof Map
        ? Object.fromEntries(foundUser.permissions)
        : foundUser.permissions || {},
      { permissionsManaged: foundUser.permissionsManaged }
    );

    const token = jwt.sign(
  {
    id: foundUser._id,
    companyName: foundUser.companyName,
    companyID: foundUser.companyID,
    role: foundUser.role,
    companyRole: foundUser.companyRole,
    showWeight: foundUser.showWeight
  },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRATION
  }
);

    res.cookie("token",token,{
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/", 
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: foundUser._id,
        companyID: foundUser.companyID,
        companyName: foundUser.companyName,
        fullName: foundUser.fullName,
        email: foundUser.email,
        role: foundUser.role,
        companyRole: foundUser.companyRole,
        permissions,
        permissionsManaged: Boolean(foundUser.permissionsManaged),
        showWeight: foundUser.showWeight,
      },
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = loginUser;
