const {
  fetchAwbTrackingBundle,
  formatPublicTrackingResponse,
} = require("../../utils/buildAwbTrackingResponse");

const getOrderByAwb = async (req, res) => {
  try {
    const { awbNumber } = req.params;
    const bundle = await fetchAwbTrackingBundle(awbNumber);

    if (!bundle.ok) {
      return res.status(bundle.status).json({
        success: false,
        message: bundle.message,
      });
    }

    return res.status(200).json(formatPublicTrackingResponse(bundle));
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tracking details",
    });
  }
};

module.exports = getOrderByAwb;
