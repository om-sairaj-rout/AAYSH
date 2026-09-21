const Company = require("../../models/company.model");
const CompanyRateProfile = require("../../models/companyRateProfile.model");
const {
  normalizeCompanyID,
  getCompanyRateProfile,
  DEFAULT_PROFILE,
} = require("../../utils/resolveCompanyRateSlabs");

const getCompanyRateProfileController = async (req, res) => {
  try {
    const companyID = normalizeCompanyID(req.params.companyID);
    if (!companyID) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }

    const company = await Company.findOne({ companyID }).select("companyID companyName").lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const profile = await getCompanyRateProfile(companyID);
    return res.status(200).json({ success: true, data: { company, profile } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCompanyRateProfileController = async (req, res) => {
  try {
    const companyID = normalizeCompanyID(req.params.companyID);
    if (!companyID) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }

    const company = await Company.findOne({ companyID }).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const {
      rovIncluded = false,
      docChargeBelow3kg = 0,
      docChargeAbove3kg = 0,
      docChargePrime = 0,
      fuelSurchargePercent = 0,
    } = req.body;

    const doc = await CompanyRateProfile.findOneAndUpdate(
      { companyID },
      {
        companyID,
        rovIncluded: Boolean(rovIncluded),
        docChargeBelow3kg: Math.max(0, Number(docChargeBelow3kg) || 0),
        docChargeAbove3kg: Math.max(0, Number(docChargeAbove3kg) || 0),
        docChargePrime: Math.max(0, Number(docChargePrime) || 0),
        fuelSurchargePercent: Math.max(0, Number(fuelSurchargePercent) || 0),
        updatedBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Company rate profile updated",
      data: {
        profile: {
          companyID,
          rovIncluded: Boolean(doc.rovIncluded),
          docChargeBelow3kg: Number(doc.docChargeBelow3kg) || 0,
          docChargeAbove3kg: Number(doc.docChargeAbove3kg) || 0,
          docChargePrime: Number(doc.docChargePrime) || 0,
          fuelSurchargePercent: Number(doc.fuelSurchargePercent) || 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCompanyRateProfileController,
  updateCompanyRateProfileController,
  DEFAULT_PROFILE,
};
