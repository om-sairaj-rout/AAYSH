const { userOwnsOrder } = require("../../utils/companyScope");
const {
  fetchAwbTrackingBundle,
  formatPublicTrackingResponse,
} = require("../../utils/buildAwbTrackingResponse");
const { getPodAvailability } = require("../../utils/shipmentPod");

const getSecureOrderByAwb = async (req, res) => {
  try {
    const { awbNumber } = req.params;
    const bundle = await fetchAwbTrackingBundle(awbNumber);

    if (!bundle.ok) {
      return res.status(bundle.status).json({
        success: false,
        message: bundle.message,
      });
    }

    if (!userOwnsOrder(bundle.order, req)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view tracking for this shipment.",
      });
    }

    const payload = formatPublicTrackingResponse(bundle);
    const pod = getPodAvailability(bundle.shipping);

    return res.status(200).json({
      ...payload,
      pod,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tracking details",
    });
  }
};

module.exports = getSecureOrderByAwb;
