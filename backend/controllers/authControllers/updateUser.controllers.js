const bcrypt = require("bcryptjs");
const User = require("../../models/user.model");

const updateUserController = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {
      username: req.body.username,
      email: req.body.email,
      mobile_number: req.body.mobile_number,
      company_name: req.body.company_name,
      gender: req.body.gender,
      address: req.body.address,
      zip_code: req.body.zip_code,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      showWeight: req.body.showWeight, // Added backend property mapper processing step
    };

    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    return res.json({
      success: true,
      user: updatedUser,
      message: "User updated successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = updateUserController;