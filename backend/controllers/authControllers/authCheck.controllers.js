const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { mapUserResponse } = require("../../utils/companyUsers");

const authCheckController = async (req, res) => {
    try {
        const userDets = await User.findById(req.user.id).select("-password -__v");
        if(!userDets){
          return res.status(404).json({ message: "User not found" });
        }

        const responseUser = mapUserResponse(userDets.toObject());

        let company = null;
        if (userDets.companyID) {
          company = await Company.findOne({ companyID: userDets.companyID })
            .select("-__v")
            .lean();
        }
      
        res.status(200).json({
          message: "User authenticated successfully",
          userDets: {
            ...responseUser,
            company,
          },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = authCheckController;
