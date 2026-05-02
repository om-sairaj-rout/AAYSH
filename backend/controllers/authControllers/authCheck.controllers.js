const User = require("../../models/User.model"); 

const authCheckController = async (req, res) => {
    try {
        const userDets = await User.findById(req.user.id).select("-password -__v");
        if(!userDets){
          return res.status(404).json({ message: "User not found" });
        }
      
        res.status(200).json({
          message: "User authenticated successfully",
          userDets,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = authCheckController;
