const UploadHistory = require("../../models/upload/uploadHistory.model");

const buildUploadHistoryFilter = (req) => {
  const filter = { isVisible: true };

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

const getUploadHistory = async (req, res) => {
  try {
    const history = await UploadHistory.find(buildUploadHistoryFilter(req)).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getUploadHistory;
