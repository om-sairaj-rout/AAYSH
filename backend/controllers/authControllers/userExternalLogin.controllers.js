// controllers/userExternalLogin.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model"); // your Mongoose model 


const loginUserExternal = async (req, res) => {
    const { email, password } = req.body;

    try {
    // 1. Check if user exists
    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Create JWT token
    const token = jwt.sign(
  {
    id: foundUser._id,
    username: foundUser.username,
    role: foundUser.role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRATION
  }
);


    // Set token in cookie
    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // was: true
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // was: "none"
      path: "/",
    });
    

    // 4. Send response
    res.status(200).json({
      message: "Login successful",
      token,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = loginUserExternal;
