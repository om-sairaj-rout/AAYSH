const CompanyCounter = require("../models/companyCounter.model");
const Company = require("../models/company.model");
const User = require("../models/user.model");

const formatCompanyId = (seq) => `AAYSH-${String(seq).padStart(6, "0")}`;

const parseCompanyIdSeq = (companyID) => {
  const match = String(companyID || "").match(/^AAYSH-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
};

const isCompanyIdTaken = async (companyID) => {
  const [inCompany, inUser] = await Promise.all([
    Company.exists({ companyID }),
    User.exists({ companyID }),
  ]);

  return Boolean(inCompany || inUser);
};

const syncCompanyCounter = async () => {
  const [companyIds, userIds] = await Promise.all([
    Company.find({ companyID: /^AAYSH-/i }).select("companyID").lean(),
    User.find({ companyID: /^AAYSH-/i }).select("companyID").lean(),
  ]);

  const maxSeq = [...companyIds, ...userIds].reduce(
    (max, doc) => Math.max(max, parseCompanyIdSeq(doc.companyID)),
    0
  );

  if (maxSeq <= 0) {
    return;
  }

  const counter = await CompanyCounter.findById("companyId");
  if (!counter || counter.seq < maxSeq) {
    await CompanyCounter.findByIdAndUpdate(
      "companyId",
      { seq: maxSeq },
      { upsert: true }
    );
    console.log(`Company ID counter synced to ${maxSeq}`);
  }
};

const generateCompanyId = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await CompanyCounter.findByIdAndUpdate(
      "companyId",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const companyID = formatCompanyId(counter.seq);
    const taken = await isCompanyIdTaken(companyID);

    if (!taken) {
      return companyID;
    }
  }

  throw new Error("Unable to generate a unique company ID");
};

module.exports = {
  generateCompanyId,
  formatCompanyId,
  syncCompanyCounter,
};
