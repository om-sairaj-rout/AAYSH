const RateStructure = require("../../models/rateStructure.model");
const PincodeServiceability = require("../../models/upload/serviceability.model");
const { RATE_ZONES } = require("../../constants/rateZones");
const {
  normalizeService,
  calculateRate,
} = require("../../utils/rateCalculator");

const resolveZone = async ({ zone, destinationPincode }) => {
  if (zone && RATE_ZONES.includes(zone)) {
    return { zone, source: "manual" };
  }

  const pincode = String(destinationPincode || "").trim();
  if (!pincode) {
    return { zone: null, source: null };
  }

  const serviceability = await PincodeServiceability.findOne({ pincode }).lean();
  if (!serviceability?.zone) {
    return { zone: null, source: null, pincode };
  }

  return { zone: serviceability.zone, source: "pincode", pincode };
};

const calculateRateController = async (req, res) => {
  try {
    const {
      service,
      weight,
      length = 0,
      breadth = 0,
      height = 0,
      zone,
      destinationPincode,
    } = req.body;

    const normalizedService = normalizeService(service);
    const zoneInfo = await resolveZone({ zone, destinationPincode });

    if (!zoneInfo.zone) {
      return res.status(400).json({
        success: false,
        message: zoneInfo.pincode
          ? `Zone not found for pincode ${zoneInfo.pincode}. Select a zone manually.`
          : "Destination zone or pincode is required.",
      });
    }

    const rateDoc = await RateStructure.findOne({ service: normalizedService }).lean();
    const slabs = rateDoc?.slabs || [];

    if (!slabs.length) {
      return res.status(400).json({
        success: false,
        message: `No rate slabs configured for ${normalizedService.toUpperCase()} service.`,
      });
    }

    const result = calculateRate({
      service: normalizedService,
      weight,
      length,
      breadth,
      height,
      zone: zoneInfo.zone,
      slabs,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        zoneSource: zoneInfo.source,
        destinationPincode: zoneInfo.pincode || destinationPincode || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = calculateRateController;
