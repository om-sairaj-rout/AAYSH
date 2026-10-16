const RateStructure = require("../models/rateStructure.model");
const CompanyRateStructure = require("../models/companyRateStructure.model");
const CompanyRateProfile = require("../models/companyRateProfile.model");
const { normalizeService } = require("./rateCalculator");

const DEFAULT_PROFILE = {
  rovIncluded: false,
  docChargeBelow3kg: 0,
  docChargeAbove3kg: 0,
  docChargePrime: 0,
  fuelSurchargePercent: 0,
};

const normalizeCompanyID = (companyID) =>
  String(companyID || "").trim().toUpperCase();

const getCompanyRateProfile = async (companyID) => {
  const normalized = normalizeCompanyID(companyID);
  if (!normalized) {
    return { companyID: "", ...DEFAULT_PROFILE, isDefault: true };
  }

  const doc = await CompanyRateProfile.findOne({ companyID: normalized }).lean();
  if (!doc) {
    return { companyID: normalized, ...DEFAULT_PROFILE, isDefault: true };
  }

  return {
    companyID: normalized,
    rovIncluded: Boolean(doc.rovIncluded),
    docChargeBelow3kg: Number(doc.docChargeBelow3kg) || 0,
    docChargeAbove3kg: Number(doc.docChargeAbove3kg) || 0,
    docChargePrime: Number(doc.docChargePrime) || 0,
    fuelSurchargePercent: Number(doc.fuelSurchargePercent) || 0,
    isDefault: false,
    updatedAt: doc.updatedAt,
  };
};

const resolveSlabsForCompany = async (companyID, service, options = {}) => {
  const { allowGlobalFallback = true } = options;
  const normalizedService = normalizeService(service);
  const normalizedCompanyID = normalizeCompanyID(companyID);

  if (normalizedCompanyID) {
    const companyDoc = await CompanyRateStructure.findOne({
      companyID: normalizedCompanyID,
      service: normalizedService,
    }).lean();

    if (companyDoc?.slabs?.length) {
      return {
        slabs: companyDoc.slabs,
        source: "company",
        companyID: normalizedCompanyID,
      };
    }

    return {
      slabs: [],
      source: "company_missing",
      companyID: normalizedCompanyID,
      message: `No weight slabs configured for company ${normalizedCompanyID} (${normalizedService}). Add slabs in Rate Management for this company.`,
    };
  }

  if (!allowGlobalFallback) {
    return {
      slabs: [],
      source: "none",
      companyID: null,
      message: "Company ID is required to calculate company-specific rates.",
    };
  }

  const globalDoc = await RateStructure.findOne({
    service: normalizedService,
  }).lean();

  return {
    slabs: globalDoc?.slabs || [],
    source: "global",
    companyID: null,
    message: globalDoc?.slabs?.length
      ? null
      : `No rate slabs configured for ${normalizedService} service.`,
  };
};

module.exports = {
  DEFAULT_PROFILE,
  normalizeCompanyID,
  getCompanyRateProfile,
  resolveSlabsForCompany,
};
