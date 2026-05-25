const User = require("../../models/user.model");

const getAllUsers = async (
  req,
  res
) => {
  try {

    const users =
      await User.find()
      .select("-password")  
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      users,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = getAllUsers;