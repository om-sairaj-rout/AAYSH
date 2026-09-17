const PincodeServiceability = require("../../models/upload/serviceability.model");

const lookupPincodeZone = async (req, res) => {
  try {
    const pincode = String(req.params.pincode || "").trim();

    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: "Pincode is required",
      });
    }

    const serviceability = await PincodeServiceability.findOne({ pincode }).lean();

    if (!serviceability) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found in serviceability data",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pincode: serviceability.pincode,
        zone: serviceability.zone,
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
