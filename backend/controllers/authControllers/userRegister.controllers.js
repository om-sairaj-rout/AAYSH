const User = require("../../models/user.model");
const bcrypt = require("bcrypt");

const RegisterController = async (req, res) => {
  try {
    const {
      companyName,
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
    } = req.body;

    if (!companyName || companyName.length < 3) {
      return res.status(400).json({
        message: "Company name must contain at least 3 letters.",
      });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 letters.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ companyName }, { email }, { mobile_number }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this company name or email",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      companyName,
      email,
      password: hashedPassword,
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
    });

    const newuser = await newUser.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newuser._id,
        companyName: newuser.companyName,
        email: newuser.email,
      },
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = RegisterController;