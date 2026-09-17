const RateStructure = require("../../models/rateStructure.model");
const { RATE_SERVICES } = require("../../constants/rateZones");
const {
  normalizeService,
  formatRateStructureForResponse,
} = require("../../utils/rateCalculator");

const ensureRateStructure = async (service) => {
  let doc = await RateStructure.findOne({ service }).lean();
  if (!doc) {
    doc = (
      await RateStructure.create({
        service,
        slabs: [],
      })
    ).toObject();
  }
  return doc;
};

const getRateStructure = async (req, res) => {
  try {
    const service = normalizeService(req.params.service);

    if (!RATE_SERVICES.includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service. Use surface, air, or prime.",
      });
    }

    const doc = await ensureRateStructure(service);

    return res.status(200).json({
      success: true,
      data: formatRateStructureForResponse(doc),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllRateStructures = async (_req, res) => {
  try {
    const docs = await Promise.all(
      RATE_SERVICES.map((service) => ensureRateStructure(service))
    );

    return res.status(200).json({
      success: true,
      data: docs.map(formatRateStructureForResponse),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getRateStructure,
  getAllRateStructures,
};
