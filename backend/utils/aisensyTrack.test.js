const assert = require("assert");
const { secureCompare } = require("./secureCompare");
const {
  normalizeIndianMobileForLookup,
  isLegacyPhoneStorage,
} = require("./phone");
const {
  parseAisensyTrackRequest,
  orderMatchesPhone,
  buildSummaryRow,
  GENERIC_NOT_FOUND,
} = require("../services/aisensy/aisensyTrack.service");
const {
  isAisensyIntegrationConfigured,
} = require("../middlewares/aisensyIntegrationAuth.middleware");
const { getMaxRequests, getWindowMs } = require("../middlewares/aisensyRateLimit.middleware");
const {
  formatPublicTrackingResponse,
} = require("./buildAwbTrackingResponse");
const { assertNoForbiddenPublicKeys } = require("./publicTrackingResponseSanitize");

assert.strictEqual(normalizeIndianMobileForLookup("9876543210").value, "9876543210");
assert.strictEqual(normalizeIndianMobileForLookup("+91 98765 43210").value, "9876543210");
assert.strictEqual(normalizeIndianMobileForLookup("919876543210").value, "9876543210");
assert.strictEqual(normalizeIndianMobileForLookup("09876543210").value, "9876543210");
assert.strictEqual(normalizeIndianMobileForLookup("5876543210").ok, false);
assert.strictEqual(normalizeIndianMobileForLookup("").ok, false);

assert.strictEqual(isLegacyPhoneStorage("919876543210"), true);
assert.strictEqual(isLegacyPhoneStorage("9876543210"), false);

const both = parseAisensyTrackRequest({
  phone: "9876543210",
  orderId: "ORD1",
  awb: "123",
});
assert.strictEqual(both.ok, false);

const parsed = parseAisensyTrackRequest({ phone: "+919876543210", page: 2, perPage: 50 });
assert.strictEqual(parsed.ok, true);
assert.strictEqual(parsed.phone, "9876543210");
assert.strictEqual(parsed.page, 2);
assert.strictEqual(parsed.perPage, 20);

const badBody = parseAisensyTrackRequest({ phone: { $gt: "" } });
assert.strictEqual(badBody.ok, false);

assert.strictEqual(
  orderMatchesPhone({ billingPhone: "9876543210", billingAlternatePhone: "" }, "9876543210"),
  true
);
assert.strictEqual(
  orderMatchesPhone({ billingPhone: "1111111111", billingAlternatePhone: "9876543210" }, "9876543210"),
  true
);
assert.strictEqual(
  orderMatchesPhone({ billingPhone: "1111111111" }, "9876543210"),
  false
);

const summary = buildSummaryRow(
  {
    externalOrderId: "ORD100397",
    orderDate: new Date("2026-11-19T12:00:00.000Z"),
    createdAt: new Date("2026-11-19T12:00:00.000Z"),
    destinationCity: "noida",
    destinationState: "up",
    category: "Local NCR",
    expectedHours: 48,
  },
  null
);
assert.strictEqual(summary.orderId, "ORD100397");
assert.strictEqual(summary.hasTracking, false);
assert.strictEqual(summary.shippingStatus, "Pending");

assert.strictEqual(secureCompare("secret-key", "secret-key"), true);
assert.strictEqual(secureCompare("secret-key", "wrong-key"), false);
assert.strictEqual(secureCompare("short", "longer-key"), false);

const prevKey = process.env.AISENSY_INTEGRATION_API_KEY;
process.env.AISENSY_INTEGRATION_API_KEY = "test-key";
assert.strictEqual(isAisensyIntegrationConfigured(), true);
delete process.env.AISENSY_INTEGRATION_API_KEY;
assert.strictEqual(isAisensyIntegrationConfigured(), false);
if (prevKey) process.env.AISENSY_INTEGRATION_API_KEY = prevKey;

assert.ok(getMaxRequests() >= 1);
assert.ok(getWindowMs() >= 10_000);

assert.strictEqual(GENERIC_NOT_FOUND, "No shipment found for this request");

const detailShape = formatPublicTrackingResponse({
  ok: true,
  order: { courierStatus: "In Transit", externalOrderId: "" },
  shipping: {
    awbNumber: "100475098683",
    courierName: "TRACKON",
    shippingStatus: "In Transit",
    pickupDate: "2026-11-19",
  },
  tracking: [
    {
      status: "In Transit",
      location: "NOIDA",
      remarks: "IN TRANSIT",
      failureReason: "",
      eventTime: "2026-11-21T21:36:00+05:30",
    },
  ],
  expectedDeliveryDate: null,
});
assert.strictEqual(assertNoForbiddenPublicKeys(detailShape).length, 0);

const runDbIntegration = async () => {
  require("dotenv").config();
  if (!process.env.MONGODB_URI) {
    return;
  }

  const mongoose = require("mongoose");
  const {
    handleAisensyTrackRequest,
    fetchDetailByOrderId,
    fetchDetailByAwb,
  } = require("../services/aisensy/aisensyTrack.service");
  const Order = require("../models/upload/order.model");
  const Shipping = require("../models/upload/shipping.model");

  await mongoose.connect(process.env.MONGODB_URI);

  const trackonShip = await Shipping.findOne({
    awbNumber: "100475098683",
  }).lean();
  if (trackonShip) {
    const order = await Order.findById(trackonShip.orderId).lean();
  if (order) {
      const phone = order.billingPhone;
      const list = await handleAisensyTrackRequest({ phone });
      assert.strictEqual(list.ok, true);
      assert.ok(list.payload.matchCount >= 1);

      const byOrder = await fetchDetailByOrderId({
        phone,
        orderId: order.externalOrderId,
      });
      assert.strictEqual(byOrder.ok, true);
      assert.strictEqual(byOrder.payload.orderId, order.externalOrderId);
      assert.strictEqual(assertNoForbiddenPublicKeys(byOrder.payload).length, 0);

      let wrongPhoneDigits = "6111111111";
      if (wrongPhoneDigits === phone) wrongPhoneDigits = "6222222222";
      const wrongPhone = await fetchDetailByOrderId({
        phone: wrongPhoneDigits,
        orderId: order.externalOrderId,
      });
      assert.strictEqual(wrongPhone.ok, false);

      const byAwb = await fetchDetailByAwb({ phone, awb: trackonShip.awbNumber });
      assert.strictEqual(byAwb.ok, true);
      assert.strictEqual(assertNoForbiddenPublicKeys(byAwb.payload).length, 0);

      const wrongAwb = await fetchDetailByAwb({
        phone,
        awb: "000000000000",
      });
      assert.strictEqual(wrongAwb.ok, false);
    }
  }

  const delShip = await Shipping.findOne({
    courierName: "Delhivery",
    awbNumber: { $ne: "" },
  }).lean();
  if (delShip) {
    const order = await Order.findById(delShip.orderId).lean();
    if (order?.billingPhone) {
      const detail = await fetchDetailByAwb({
        phone: order.billingPhone,
        awb: delShip.awbNumber,
      });
      assert.strictEqual(detail.ok, true);
      assert.strictEqual(detail.payload.shipping.courierName, "Delhivery");
    }
  }

  await mongoose.disconnect();
};

(async () => {
  await runDbIntegration();
  console.log("aisensyTrack.test.js: all assertions passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});