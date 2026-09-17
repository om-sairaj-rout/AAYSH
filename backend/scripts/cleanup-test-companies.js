require("dotenv").config();
const mongoose = require("mongoose");
const Company = require("../models/company.model");

const TEST_COMPANY_IDS = ["TEST-ORDER-ID-A", "TEST-ORDER-ID-B"];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const result = await Company.deleteMany({
    companyID: { $in: TEST_COMPANY_IDS },
  });

  const remaining = await Company.find({})
    .select("companyID companyName")
    .sort({ companyName: 1 })
    .lean();

  console.log(`Deleted ${result.deletedCount} test company record(s).`);
  console.log(
    "Remaining companies:",
    remaining.map((row) => `${row.companyName} (${row.companyID})`).join(", ")
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
