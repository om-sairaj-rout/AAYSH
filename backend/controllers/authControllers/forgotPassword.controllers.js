const jwt = require("jsonwebtoken");
const User = require("../../models/user.model.js");
const sendMail = require("../../utils/sendEmail.js");

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always send same response
    if (!user) {
      return res.status(200).json({
        message:
          "If account exists, reset email sent",
      });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Reset URL
    const resetURL =
      `http://localhost:5173/reset-password/${token}`;

    // Send Email
    await sendMail(
      email,
      "Password Reset",
      `
      <h2>Password Reset</h2>

      <p>Click below link:</p>

      <a href="${resetURL}">
        Reset Password
      </a>
      `
    );

    res.status(200).json({
      message:
        "If account exists, reset email sent",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = forgotPassword;