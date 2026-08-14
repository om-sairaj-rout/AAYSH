const UploadHistory = require("../../models/upload/uploadHistory.model");

const buildUploadHistoryFilter = (req, extra = {}) => {
  const filter = { ...extra };

  if (req.user?.role === "admin") {
    return filter;
  }

  if (req.user?.companyID) {
    filter.companyID = req.user.companyID;
    return filter;
  }

  filter.uploadedBy = req.user.id;
  return filter;
};

const deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const history = await UploadHistory.findOne(
      buildUploadHistoryFilter(req, { _id: id })
    );

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "History not found",
      });
    }

    history.isVisible = false;

    await history.save();

    return res.status(200).json({
      success: true,
      message: "Removed from your dashboard",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = deleteHistory;
