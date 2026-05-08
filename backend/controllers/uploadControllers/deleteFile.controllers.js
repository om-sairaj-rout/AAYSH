const UploadHistory = require("../../models/upload/uploadHistory.model");

const deleteHistory = async (req, res) => {

    try {

        const { id } = req.params;

        const history = await UploadHistory.findOne({

            _id: id,

            uploadedBy: req.user.id

        });

        if (!history) {
            return res.status(404).json({
                success: false,
                message: "History not found"
            });
        }

        history.isVisible = false;

        await history.save();

        return res.status(200).json({
            success: true,
            message: "Removed from your dashboard"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = deleteHistory;