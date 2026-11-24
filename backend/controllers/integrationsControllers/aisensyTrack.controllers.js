const {
  handleAisensyTrackRequest,
} = require("../../services/aisensy/aisensyTrack.service");

const aisensyTrack = async (req, res) => {
  try {
    const result = await handleAisensyTrackRequest(req.body);

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message || "Request could not be processed",
      });
    }

    return res.status(result.status || 200).json(result.payload);
  } catch (err) {
    if (err?.code === "PUBLIC_TRACKING_LEAK") {
      console.error("[aisensyTrack] privacy guard triggered");
      return res.status(500).json({
        success: false,
        message: "Server error while fetching tracking details",
      });
    }
    console.error("[aisensyTrack]", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tracking details",
    });
  }
};

module.exports = aisensyTrack;