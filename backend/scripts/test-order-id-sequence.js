const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const Order = require("../models/upload/order.model");
const Company = require("../models/company.model");
const OrderIdCounter = require("../models/orderIdCounter.model");
const {
  allocateOrderExternalId,
  getNextOrderIdPreview,
  resolveCompanyOrderIdSequence,
  resolveOrderExternalId,
  syncOrderIdCounter,
} = require("../utils/generateOrderId");

const TEST_COMPANY = "TEST-ORDER-ID-CO";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await Order.deleteMany({ companyID: TEST_COMPANY });
  await OrderIdCounter.deleteMany({ companyID: TEST_COMPANY });
  await Company.findOneAndUpdate(
    { companyID: TEST_COMPANY },
    {
      companyID: TEST_COMPANY,
      companyName: "Test Order ID Co",
      defaultOrderIdSequence: "alphanumeric",
      orderIdSequenceLocked: false,
    },
    { upsert: true }
  );

  const numericPreview1 = await getNextOrderIdPreview(TEST_COMPANY, "numeric");
  const numericPreview2 = await getNextOrderIdPreview(TEST_COMPANY, "numeric");
  if (numericPreview1.orderId !== numericPreview2.orderId) {
    throw new Error("Preview should not consume sequence");
  }
  if (numericPreview1.orderId !== "100001") {
    throw new Error(`Expected first numeric preview 100001, got ${numericPreview1.orderId}`);
  }

  const id1 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY,
  });
  const id2 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY,
  });
  const id3 = await resolveOrderExternalId({
    body: { order_id_mode: "auto", order_id_sequence: "numeric" },
    companyID: TEST_COMPANY,
  });

  if (id1 !== "100001" || id2 !== "100002" || id3 !== "100003") {
    throw new Error(`Numeric sequence mismatch: ${id1}, ${id2}, ${id3}`);
  }

  const locked = await resolveCompanyOrderIdSequence({
    companyID: TEST_COMPANY,
  });
  if (!locked.sequenceLocked || locked.sequenceType !== "numeric") {
    throw new Error("Company sequence should be locked to numeric after auto orders");
  }

  try {
    await resolveOrderExternalId({
      body: { order_id_mode: "auto", order_id_sequence: "alphanumeric" },
      companyID: TEST_COMPANY,
    });
    throw new Error("Expected sequence change to be rejected");
  } catch (error) {
    if (!/cannot be changed|already has orders/i.test(error.message)) {
      throw error;
    }
  }

  await Order.create({
    uploadedBy: new mongoose.Types.ObjectId(),
    companyID: TEST_COMPANY,
    externalOrderId: id1,
    orderItems: [{ name: "Test", units: 1, sellingPrice: 10 }],
    subTotal: 10,
    invoiceValue: 10,
  });

  await syncOrderIdCounter(TEST_COMPANY, "numeric");
  const previewAfter = await getNextOrderIdPreview(TEST_COMPANY, "numeric");
  if (previewAfter.orderId !== "100004") {
    throw new Error(`Expected preview 100004 after restart sync, got ${previewAfter.orderId}`);
  }

  const allocations = await Promise.all(
    Array.from({ length: 5 }, () =>
      resolveOrderExternalId({
        body: { order_id_mode: "auto", order_id_sequence: "numeric" },
        companyID: TEST_COMPANY,
      })
    )
  );
  const unique = new Set(allocations);
  if (unique.size !== allocations.length) {
    throw new Error(`Duplicate IDs in concurrent allocation: ${allocations.join(", ")}`);
  }

  await Order.deleteMany({ companyID: TEST_COMPANY });
  await OrderIdCounter.deleteMany({ companyID: TEST_COMPANY });
  await Company.deleteOne({ companyID: TEST_COMPANY });

  console.log("Order ID sequence tests passed");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
