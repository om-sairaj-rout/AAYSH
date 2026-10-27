const { resolvePincodeRateZone } = require("../../utils/resolvePincodeRateZone");

const lookupPincodeZone = async (req, res) => {
  try {
    const pincode = String(req.params.pincode || "").trim();

    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: "Pincode is required",
      });
    }

    const resolved = await resolvePincodeRateZone({ pincode });

    if (!resolved.zone) {
      return res.status(404).json({
        success: false,
        message: resolved.message || "Zone not found for this pincode",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pincode,
        zone: resolved.zone,
        source: resolved.source,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = lookupPincodeZone;
