const User =
require("../../models/user.model");

const deleteUserController =
async (req, res) => {

  try {

    const { id } =
      req.params;

    const user =
      await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    // Prevent deleting self
    if (
      req.user.id === id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(
      id
    );

    return res.json({
      success: true,
      message:
        "User deleted successfully",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });

  }
};

module.exports =
deleteUserController;