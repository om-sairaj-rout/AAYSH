const RateStructure = require("../../models/rateStructure.model");
const { RATE_SERVICES } = require("../../constants/rateZones");
const {
  normalizeService,
  normalizeSlabInput,
  formatRateStructureForResponse,
} = require("../../utils/rateCalculator");

const validateSlabs = (slabs = []) => {
  if (!Array.isArray(slabs)) {
    return "Slabs must be an array";
  }

  for (const [index, slab] of slabs.entries()) {
    if (!String(slab.name || "").trim()) {
      return `Slab ${index + 1}: name is required`;
    }

    if (!Number.isFinite(Number(slab.minWeight)) || Number(slab.minWeight) < 0) {
      return `Slab ${index + 1}: min weight must be a valid number`;
    }

    if (
      slab.maxWeight !== null &&
      slab.maxWeight !== undefined &&
      slab.maxWeight !== "" &&
      (!Number.isFinite(Number(slab.maxWeight)) || Number(slab.maxWeight) < 0)
    ) {
      return `Slab ${index + 1}: max weight must be a valid number`;
    }

    if (!Number.isFinite(Number(slab.baseWeight)) || Number(slab.baseWeight) < 0) {
      return `Slab ${index + 1}: base weight is required`;
    }

    if (!Number.isFinite(Number(slab.incrementStep)) || Number(slab.incrementStep) < 0) {
      return `Slab ${index + 1}: increment step is required`;
    }
  }

  return null;
};

const updateRateStructure = async (req, res) => {
  try {
    const service = normalizeService(req.params.service);

    if (!RATE_SERVICES.includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service. Use surface, air, or prime.",
      });
    }

    const { slabs = [] } = req.body;
    const validationError = validateSlabs(slabs);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const normalizedSlabs = slabs.map((slab, index) => normalizeSlabInput(slab, index));

    const doc = await RateStructure.findOneAndUpdate(
      { service },
      {
        service,
        slabs: normalizedSlabs,
        updatedBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Rate structure updated successfully",
      data: formatRateStructureForResponse(doc),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = updateRateStructure;
