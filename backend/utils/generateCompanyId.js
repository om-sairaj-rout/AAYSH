const CompanyCounter = require("../models/companyCounter.model");
const Company = require("../models/company.model");

const formatCompanyId = (seq) => `AAYSH-${String(seq).padStart(6, "0")}`;

const generateCompanyId = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const counter = await CompanyCounter.findByIdAndUpdate(
      "companyId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const companyID = formatCompanyId(counter.seq);
    const exists = await Company.exists({ companyID });

    if (!exists) {
      return companyID;
    }
  }

  throw new Error("Unable to generate a unique company ID");
};

module.exports = {
  generateCompanyId,
  formatCompanyId,
};
