const ReversePickup = require("../../models/reversePickup.model");

const rejectReversePickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!String(rejectionReason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const request = await ReversePickup.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Reverse pickup request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    request.status = "rejected";
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.rejectionReason = String(rejectionReason).trim();
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Reverse pickup request rejected",
      request,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = rejectReversePickup;
