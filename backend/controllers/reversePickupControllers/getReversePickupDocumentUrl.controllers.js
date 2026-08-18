const ReversePickup = require("../../models/reversePickup.model");
const {
  buildReversePickupDocumentPayload,
} = require("../../utils/reversePickupDocument");

const getReversePickupDocumentUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ReversePickup.findById(id).lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Reverse pickup request not found",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      String(request.requestedBy) === String(req.user.id);
    const isSameCompany =
      req.user.companyID &&
      request.companyID === req.user.companyID;

    if (!isAdmin && !isOwner && !isSameCompany) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    const payload = await buildReversePickupDocumentPayload(request);

    if (!payload.ok) {
      return res.status(payload.status).json({
        success: false,
        message: payload.message,
      });
    }

    return res.status(200).json({
      success: true,
      url: payload.url,
      fileName: payload.fileName,
      legacy: payload.legacy || false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getReversePickupDocumentUrl;
