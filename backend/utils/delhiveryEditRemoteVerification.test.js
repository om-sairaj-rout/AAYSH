const assert = require("assert");
const {
  verifyEditAgainstRemoteHints,
  VERIFICATION_OUTCOME,
  extractEditableHintsFromTrackPayload,
} = require("../services/delhivery/delhiveryEditRemoteVerification");
const { DELHIVERY_EDIT_PT } = require("../services/delhivery/delhiveryEditShipmentOperationLogic");

const trackWithPt = (pt, cod) => ({
  ShipmentData: [
    {
      Shipment: {
        PaymentMode: pt,
        CODAmount: cod,
        Consignee: { Name: "Jane", Address: "12 Main St", Phone: "9876543210" },
      },
    },
  ],
});

// Payment conversion already applied remotely
let v = verifyEditAgainstRemoteHints({
  payloadTemplate: { pt: DELHIVERY_EDIT_PT.PREPAID },
  trackRaw: trackWithPt("Prepaid", 0),
});
assert.strictEqual(v.outcome, VERIFICATION_OUTCOME.VERIFIED_APPLIED);

v = verifyEditAgainstRemoteHints({
  payloadTemplate: { pt: DELHIVERY_EDIT_PT.COD, cod: 500 },
  trackRaw: trackWithPt("COD", 500),
});
assert.strictEqual(v.outcome, VERIFICATION_OUTCOME.VERIFIED_APPLIED);

// Address edit confirmed remotely
v = verifyEditAgainstRemoteHints({
  payloadTemplate: { add: "12 Main St", name: "Jane" },
  trackRaw: trackWithPt("COD", 100),
});
assert.strictEqual(v.outcome, VERIFICATION_OUTCOME.VERIFIED_APPLIED);

// Remote unchanged — safe retry for verifiable pt field only
v = verifyEditAgainstRemoteHints({
  payloadTemplate: { pt: DELHIVERY_EDIT_PT.PREPAID },
  trackRaw: trackWithPt("COD", 100),
});
assert.strictEqual(v.outcome, VERIFICATION_OUTCOME.UNCHANGED_SAFE_TO_RETRY);

// Partial / mismatch
v = verifyEditAgainstRemoteHints({
  payloadTemplate: { pt: DELHIVERY_EDIT_PT.PREPAID, add: "New Addr" },
  trackRaw: trackWithPt("Prepaid", 0),
});
assert.strictEqual(v.outcome, VERIFICATION_OUTCOME.PARTIAL_OR_MISMATCH);

// Dimensions not in tracking — verification unavailable
v = verifyEditAgainstRemoteHints({
  payloadTemplate: { gm: 2500, l: 10, b: 10, h: 10 },
  trackRaw: trackWithPt("COD", 0),
});
assert.strictEqual(v.outcome, VERIFICATION_OUTCOME.UNAVAILABLE);

const caps = extractEditableHintsFromTrackPayload(trackWithPt("COD", 50));
assert.ok(caps.capabilities.includes("pt"));
assert.ok(caps.capabilities.includes("name"));

console.log("delhiveryEditRemoteVerification.test.js: all assertions passed");