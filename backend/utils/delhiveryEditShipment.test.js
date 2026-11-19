const assert = require("assert");
const {
  isPaymentConversionAllowed,
  resolveEditEligibility,
  buildEditPayloadDelta,
  normalizeDelhiveryPt,
  parseDelhiveryEditResponse,
} = require("../services/delhivery/delhiveryEditShipmentValidation");

const baseOrder = {
  consigneeName: "Alex",
  billingPhone: "9876543210",
  billingAlternatePhone: "",
  address: "12 Main St",
  address2: "",
  destinationCity: "Mumbai",
  paymentMethod: "COD",
  invoiceValue: 500,
  chargeableWeight: 1.2,
  length: 10,
  breadth: 10,
  height: 10,
  orderItems: [{ name: "Shirt", units: 1 }],
};

// Payment conversion
assert.strictEqual(
  isPaymentConversionAllowed("COD", "Prepaid").ok,
  true
);
assert.strictEqual(
  isPaymentConversionAllowed("Prepaid", "COD", 250).ok,
  true
);
assert.strictEqual(
  isPaymentConversionAllowed("Prepaid", "COD").ok,
  false
);
assert.strictEqual(isPaymentConversionAllowed("COD", "COD").ok, false);
assert.strictEqual(isPaymentConversionAllowed("Prepaid", "Prepaid").ok, false);
assert.strictEqual(isPaymentConversionAllowed("Prepaid", "Pickup").ok, false);
assert.strictEqual(isPaymentConversionAllowed("COD", "REPL").ok, false);

// Status validation
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "Manifested" }).editable,
  true
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "In Transit" }).editable,
  true
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "Pending" }).editable,
  true
);
assert.strictEqual(
  resolveEditEligibility({
    delhiveryStatus: "Scheduled",
    shipmentKind: "rvp",
  }).editable,
  true
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "Delivered" }).editable,
  false
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "RTO" }).editable,
  false
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "LOST" }).editable,
  false
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "Dispatched" }).editable,
  false
);
assert.strictEqual(
  resolveEditEligibility({ delhiveryStatus: "" }).editable,
  false
);

// Basic delta — only changed fields
const deltaName = buildEditPayloadDelta({
  order: baseOrder,
  changes: { name: "Jordan" },
});
assert.strictEqual(deltaName.payload.name, "Jordan");
assert.strictEqual(deltaName.payload.pt, undefined);

const deltaAddress = buildEditPayloadDelta({
  order: baseOrder,
  changes: { address: "45 New Road, Block B" },
});
assert.ok(deltaAddress.payload.add);

// Payment conversion payload
const deltaPay = buildEditPayloadDelta({
  order: { ...baseOrder, paymentMethod: "PREPAID", invoiceValue: 0 },
  changes: { paymentMethod: "COD", codAmount: 999 },
  includePaymentChange: true,
});
assert.strictEqual(deltaPay.payload.pt, "COD");
assert.strictEqual(deltaPay.payload.cod, 999);

// pt omitted for ordinary address edit
const deltaNoPt = buildEditPayloadDelta({
  order: baseOrder,
  changes: { name: "Sam" },
  includePaymentChange: false,
});
assert.strictEqual(deltaNoPt.payload.pt, undefined);

// Response parsing — no false success on error body
const rejectParse = parseDelhiveryEditResponse({
  status: 400,
  data: { error: "Invalid phone" },
});
assert.strictEqual(rejectParse.success, false);

const okParse = parseDelhiveryEditResponse({
  status: 200,
  data: { success: true },
});
assert.strictEqual(okParse.success, true);
assert.strictEqual(okParse.confirmed, true);

const unconfirmed200 = parseDelhiveryEditResponse({ status: 200, data: {} });
assert.strictEqual(unconfirmed200.success, false);
assert.strictEqual(unconfirmed200.unconfirmed, true);

const uncertainParse = parseDelhiveryEditResponse({
  status: 503,
  data: {},
});
assert.strictEqual(uncertainParse.success, false);
assert.strictEqual(uncertainParse.uncertain, true);

assert.strictEqual(normalizeDelhiveryPt("PRE-PAID"), "");

assert.strictEqual(normalizeDelhiveryPt("prepaid"), "Prepaid");

console.log("delhiveryEditShipment.test.js: all assertions passed");
