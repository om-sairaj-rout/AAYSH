const Company = require("../models/company.model");

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const resolveDelhiveryOriginPin = async (companyID) => {
  const fromEnv = digitsOnly(process.env.DELHIVERY_ORIGIN_PIN);
  if (/^\d{6}$/.test(fromEnv)) {
    return { originPin: fromEnv, source: "env" };
  }

  const normalizedCompanyId = String(companyID || "")
    .trim()
    .toUpperCase();
  if (normalizedCompanyId) {
    const company = await Company.findOne({ companyID: normalizedCompanyId })
      .select("zip_code")
      .lean();
    const companyZip = digitsOnly(company?.zip_code);
    if (/^\d{6}$/.test(companyZip)) {
      return { originPin: companyZip, source: "company.zip_code" };
    }
  }

  return {
    originPin: null,
    source: null,
    message:
      "Delhivery origin pincode is not configured. Set DELHIVERY_ORIGIN_PIN or company zip_code (6 digits).",
  };
};

module.exports = {
  resolveDelhiveryOriginPin,
};
