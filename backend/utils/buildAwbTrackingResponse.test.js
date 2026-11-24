const assert = require("assert");
const {
  formatPublicTrackingResponse,
  formatSecureTrackingResponse,
} = require("./buildAwbTrackingResponse");
const {
  assertNoForbiddenPublicKeys,
  scrubPublicTrackingText,
} = require("./publicTrackingResponseSanitize");

const sensitiveBundle = {
  ok: true,
  trackonOnly: false,
  expectedDeliveryDate: "2026-11-21T19:00:00+05:30",
  order: {
    _id: "6afef4a52750fae4e3a9cfa3",
    companyID: "AAYSH-000008",
    consigneeName: "Shubham",
    consigneeLastName: "Solanki",
    billingPhone: "8882719505",
    consigneeEmail: "secret@example.com",
    address: "Full street address",
    destinationCity: "noida",
    invoiceValue: 100,
    walletTransactionId: "wtx_123",
  },
  shipping: {
    _id: "6afef4a52750fae4e3a9cfa4",
    orderId: "6afef4a52750fae4e3a9cfa3",
    awbNumber: "100475098683",
    courierName: "TRACKON",
    shippingStatus: "In Transit",
    pickupDate: "2026-11-19",
    trackonTrackingClaimToken: "secret-token",
    podDocument: { s3Key: "private/pod.pdf" },
  },
  tracking: [
    {
      _id: "abc",
      shippingId: "6afef4a52750fae4e3a9cfa4",
      status: "In Transit",
      location: "NDAH-NOIDA BRANCH",
      remarks: "Call 9876543210 or email test@carrier.com",
      failureReason: "",
      eventTime: new Date("2026-11-21T16:06:00.000Z"),
      updatedBy: "6a6e2678d3b8a116520e4a1d",
    },
  ],
};

const pub = formatPublicTrackingResponse(sensitiveBundle);
const leaked = assertNoForbiddenPublicKeys(pub);
assert.strictEqual(
  leaked.length,
  0,
  `public response leaked keys: ${leaked.join(", ")}`
);

assert.strictEqual(pub.success, true);
assert.strictEqual(pub.shipping.awbNumber, "100475098683");
assert.strictEqual(pub.shipping.courierName, "TRACKON");
assert.strictEqual(pub.shipping.shippingStatus, "In Transit");
assert.strictEqual(pub.shipping.pickupDate, "2026-11-19");
assert.strictEqual(pub.expectedDeliveryDate, "2026-11-21T19:00:00+05:30");
assert.strictEqual(pub.tracking.length, 1);
assert.strictEqual(pub.tracking[0].status, "In Transit");
assert.ok(!pub.tracking[0]._id);
assert.ok(pub.tracking[0].remarks.includes("[redacted]"));
assert.ok(!pub.tracking[0].remarks.includes("9876543210"));

assert.ok(scrubPublicTrackingText("email user@host.com now").includes("[redacted]"));

const delhiveryBundle = {
  ...sensitiveBundle,
  shipping: {
    ...sensitiveBundle.shipping,
    courierName: "Delhivery",
    shippingStatus: "Delivered",
    deliveredAt: new Date("2026-11-21T13:14:53.000Z"),
  },
};
const pubDel = formatPublicTrackingResponse(delhiveryBundle);
assert.strictEqual(pubDel.shipping.courierName, "Delhivery");
assert.strictEqual(pubDel.shipping.shippingStatus, "Delivered");
assert.ok(pubDel.shipping.deliveredAt);
assert.ok(pubDel.order.deliveryDate);
assert.strictEqual(assertNoForbiddenPublicKeys(pubDel).length, 0);

const trackonOnlyBundle = {
  ok: true,
  trackonOnly: true,
  expectedDeliveryDate: null,
  order: { courierStatus: "In Transit", externalOrderId: "" },
  shipping: {
    awbNumber: "190001234567",
    shippingStatus: "In Transit",
    courierName: "TRACKON",
    pickupDate: null,
  },
  tracking: [
    {
      status: "Booked",
      location: "MUMBAI",
      remarks: "S/MENT BOOKED",
      failureReason: "",
      eventTime: "2026-11-21T15:09:00+05:30",
    },
  ],
};
const pubTrackon = formatPublicTrackingResponse(trackonOnlyBundle);
assert.strictEqual(pubTrackon.trackonOnly, true);
assert.strictEqual(pubTrackon.order.courierStatus, "In Transit");
assert.strictEqual(pubTrackon.shipping.courierName, "TRACKON");
assert.strictEqual(assertNoForbiddenPublicKeys(pubTrackon).length, 0);

const secure = formatSecureTrackingResponse(sensitiveBundle);
assert.strictEqual(secure.order.consigneeName, "Shubham");
assert.strictEqual(secure.order.companyID, "AAYSH-000008");
assert.ok(secure.shipping._id);

console.log("buildAwbTrackingResponse.test.js: all assertions passed");