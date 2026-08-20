const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const Order = require("../models/upload/order.model");
const Company = require("../models/company.model");
const OrderIdCounter = require("../models/orderIdCounter.model");
const {
  getNextOrderIdPreview,
  resolveCompanyOrderIdSequence,
  resolveOrderExternalId,
} = require("../utils/generateOrderId");

const TEST_COMPANY_A = "TEST-ORDER-ID-A";
const TEST_COMPANY_B = "TEST-ORDER-ID-B";

const ensureCompany = async (companyID, sequence = "alphanumeric") => {
  await Company.findOneAndUpdate(
    { companyID },
    {
      companyID,
      companyName: companyID,
      defaultOrderIdSequence: sequence,
      orderIdSequenceLocked: false,
    },
    { upsert: true }
  );
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await Order.deleteMany({
    companyID: { $in: [TEST_COMPANY_A, TEST_COMPANY_B] },
  });
  await OrderIdCounter.deleteMany({ _id: { $in: ["numeric", "alphanumeric"] } });
  await Company.deleteMany({
    companyID: { $in: [TEST_COMPANY_A, TEST_COMPANY_B] },
  });

  await ensureCompany(TEST_COMPANY_A, "alphanumeric");
  await ensureCompany(TEST_COMPANY_B, "alphanumeric");

  const preview1 = await getNextOrderIdPreview(TEST_COMPANY_A, "numeric");
  const preview2 = await getNextOrderIdPreview(TEST_COMPANY_A, "numeric");
  if (preview1.orderId !== preview2.orderId) {
    throw new Error("Preview should not consume sequence");
  }
  if (preview1.orderId !== "100001") {
    throw new Error(`Expected first numeric preview 100001, got ${preview1.orderId}`);
  }

  const counterAfterPreview = await OrderIdCounter.findById("numeric").lean();
  if (counterAfterPreview?.seq && counterAfterPreview.seq >= 100001) {
    throw new Error("Preview must not increment global numeric counter");
  }

  const idA1 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY_A,
  });
  const idB1 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY_B,
  });
  const idA2 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY_A,
  });

  if (idA1 !== "100001" || idB1 !== "100002" || idA2 !== "100003") {
    throw new Error(
      `Global numeric sequence mismatch: A1=${idA1}, B1=${idB1}, A2=${idA2}`
    );
  }

  await Order.create({
    uploadedBy: new mongoose.Types.ObjectId(),
    companyID: TEST_COMPANY_A,
    externalOrderId: "100050",
    orderItems: [{ name: "Manual Excel", units: 1, sellingPrice: 10 }],
    subTotal: 10,
    invoiceValue: 10,
  });

  await Company.findOneAndUpdate(
    { companyID: TEST_COMPANY_B },
    { orderIdSequenceLocked: false, defaultOrderIdSequence: "numeric" }
  );

  const idAfterManualConflict = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY_B,
  });
  if (idAfterManualConflict !== "100004") {
    throw new Error(
      `Expected 100004 after skipping manual 100050, got ${idAfterManualConflict}`
    );
  }

  const lockedA = await resolveCompanyOrderIdSequence({
    companyID: TEST_COMPANY_A,
  });
  if (!lockedA.sequenceLocked || lockedA.sequenceType !== "numeric") {
    throw new Error("Company A should be locked to numeric after auto order");
  }

  await Company.findOneAndUpdate(
    { companyID: TEST_COMPANY_B },
    { orderIdSequenceLocked: false, defaultOrderIdSequence: "alphanumeric" }
  );

  const alpha1 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "alphanumeric" },
    companyID: TEST_COMPANY_B,
  });
  const alpha2 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "alphanumeric" },
    companyID: TEST_COMPANY_B,
  });

  if (alpha1 !== "ORD100001" || alpha2 !== "ORD100002") {
    throw new Error(`Alphanumeric sequence mismatch: ${alpha1}, ${alpha2}`);
  }

  const allocations = await Promise.all(
    Array.from({ length: 5 }, () =>
      resolveOrderExternalId({
        body: { order_id_mode: "auto", order_id_sequence: "numeric" },
        companyID: TEST_COMPANY_A,
      })
    )
  );
  const unique = new Set(allocations);
  if (unique.size !== allocations.length) {
    throw new Error(`Duplicate IDs in concurrent allocation: ${allocations.join(", ")}`);
  }

  await Order.deleteMany({
    companyID: { $in: [TEST_COMPANY_A, TEST_COMPANY_B] },
  });
  await OrderIdCounter.deleteMany({ _id: { $in: ["numeric", "alphanumeric"] } });
  await Company.deleteMany({
    companyID: { $in: [TEST_COMPANY_A, TEST_COMPANY_B] },
  });

  console.log("Order ID sequence tests passed");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
