const Company = require("../../models/company.model");
const CompanyRateStructure = require("../../models/companyRateStructure.model");
const { RATE_SERVICES } = require("../../constants/rateZones");
const { normalizeCompanyID } = require("../../utils/resolveCompanyRateSlabs");
const {
  normalizeService,
  normalizeSlabInput,
  formatRateStructureForResponse,
} = require("../../utils/rateCalculator");

const validateSlabs = (slabs = []) => {
  if (!Array.isArray(slabs)) return "Slabs must be an array";

  for (const [index, slab] of slabs.entries()) {
    if (!String(slab.name || "").trim()) {
      return `Slab ${index + 1}: name is required`;
    }
  }

  return null;
};

const getCompanyRateStructureController = async (req, res) => {
  try {
    const companyID = normalizeCompanyID(req.params.companyID);
    const service = normalizeService(req.params.service);

    if (!companyID) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }

    if (!RATE_SERVICES.includes(service)) {
      return res.status(400).json({ success: false, message: "Invalid service." });
    }

    const company = await Company.findOne({ companyID }).select("companyID companyName").lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const companyDoc = await CompanyRateStructure.findOne({
      companyID,
      service,
    }).lean();

    const responseSlabs = companyDoc?.slabs?.length
      ? formatRateStructureForResponse({ service, slabs: companyDoc.slabs }).slabs
      : [];

    return res.status(200).json({
      success: true,
      data: {
        company,
        service,
        slabs: responseSlabs,
        slabSource: companyDoc?.slabs?.length ? "company" : "none",
        hasCompanyOverride: Boolean(companyDoc?.slabs?.length),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCompanyRateStructureController = async (req, res) => {
  try {
    const companyID = normalizeCompanyID(req.params.companyID);
    const service = normalizeService(req.params.service);
    const { slabs = [] } = req.body;

    if (!companyID) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }

    if (!RATE_SERVICES.includes(service)) {
      return res.status(400).json({ success: false, message: "Invalid service." });
    }

    const company = await Company.findOne({ companyID }).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const validationError = validateSlabs(slabs);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const normalizedSlabs = slabs.map((slab, index) => normalizeSlabInput(slab, index));

    const doc = await CompanyRateStructure.findOneAndUpdate(
      { companyID, service },
      {
        companyID,
        service,
        slabs: normalizedSlabs,
        updatedBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Company rate structure updated",
      data: formatRateStructureForResponse(doc),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCompanyRateStructureController,
  updateCompanyRateStructureController,
};
