const UploadHistory = require("../../models/upload/uploadHistory.model");

const getUploadHistory = async (req, res) => {

    try {

        const history = await UploadHistory.find({

            uploadedBy: req.user.id,

            isVisible: true

        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            history
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = getUploadHistory;