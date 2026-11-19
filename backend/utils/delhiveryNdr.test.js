const assert = require("assert");
const {
  RE_ATTEMPT_NSL,
  PICKUP_RESCHEDULE_NSL,
  validateNdrAction,
  evaluateNdrEligibility,
  isAttemptCountEligible,
  extractUplIdFromSubmitResponse,
  parseNdrSubmitResponse,
} = require("../services/delhivery/delhiveryNdrValidation");
const { extractNdrHintsFromTrack } = require("../services/delhivery/delhiveryNdrTrackingHints");
const { NDR_UPDATE_PATH } = require("../services/delhivery/delhiveryNdrApi");
const { assertWaybillBelongsToOrder } = require("../services/delhivery/delhiveryDocument.service");

assert.strictEqual(NDR_UPDATE_PATH, "/api/p/update");
assert.strictEqual(validateNdrAction("RE-ATTEMPT").ok, true);
assert.strictEqual(validateNdrAction("PICKUP_RESCHEDULE").ok, true);
assert.strictEqual(validateNdrAction("AUTO").ok, false);

const trackWith = (nsl, attempt, status, extra = {}) => ({
  ShipmentData: [
    {
      Shipment: {
        Status: { Status: status },
        AttemptCount: attempt,
        Scans: [{ Instructions: `Customer issue ${nsl}` }],
        ...extra,
      },
    },
  ],
});

for (const nsl of RE_ATTEMPT_NSL) {
  const hints = extractNdrHintsFromTrack(trackWith(nsl, 1, "Pending"));
  const elig = evaluateNdrEligibility({
    hints,
    order: { isReversePickup: false },
    shipping: { courierName: "Delhivery" },
  });
  assert.ok(
    elig.eligibleActions.includes("RE-ATTEMPT"),
    `expected RE-ATTEMPT for ${nsl}`
  );
}

for (const nsl of PICKUP_RESCHEDULE_NSL) {
  const hints = extractNdrHintsFromTrack(
    trackWith(nsl, 2, "Canceled", { OTPCancellation: false })
  );
  const elig = evaluateNdrEligibility({
    hints,
    order: { isReversePickup: true },
    shipping: { courierName: "Delhivery" },
  });
  assert.ok(
    elig.eligibleActions.includes("PICKUP_RESCHEDULE"),
    `expected PICKUP_RESCHEDULE for ${nsl}`
  );
}

const invalidNsl = extractNdrHintsFromTrack(trackWith("EOD-999", 1, "Pending"));
const invalidElig = evaluateNdrEligibility({
  hints: invalidNsl,
  order: { isReversePickup: false },
  shipping: {},
});
assert.ok(!invalidElig.eligibleActions.includes("RE-ATTEMPT"));

assert.strictEqual(isAttemptCountEligible(0), false);
assert.strictEqual(isAttemptCountEligible(1), true);
assert.strictEqual(isAttemptCountEligible(2), true);
assert.strictEqual(isAttemptCountEligible(3), false);

const otpHints = extractNdrHintsFromTrack(
  trackWith("EOD-777", 1, "Canceled", { OTPCancellation: true })
);
assert.strictEqual(otpHints.otpCancelled, true);
const otpElig = evaluateNdrEligibility({
  hints: otpHints,
  order: { isReversePickup: true },
  shipping: {},
});
assert.ok(!otpElig.eligibleActions.includes("PICKUP_RESCHEDULE"));

const nonOtp = extractNdrHintsFromTrack(
  trackWith("EOD-21", 2, "Cancelled")
);
const nonOtpElig = evaluateNdrEligibility({
  hints: nonOtp,
  order: { isReversePickup: true },
  shipping: {},
});
assert.ok(nonOtpElig.eligibleActions.includes("PICKUP_RESCHEDULE"));

const forwardPickup = evaluateNdrEligibility({
  hints: extractNdrHintsFromTrack(trackWith("EOD-777", 1, "Canceled")),
  order: { isReversePickup: false },
  shipping: {},
});
assert.ok(!forwardPickup.eligibleActions.includes("PICKUP_RESCHEDULE"));

const wb = ["M1", "C1"];
assert.strictEqual(assertWaybillBelongsToOrder("C1", wb).ok, true);
assert.strictEqual(assertWaybillBelongsToOrder("OTHER", wb).ok, false);

const upl = extractUplIdFromSubmitResponse({ upl_id: "UPL123" });
assert.strictEqual(upl, "UPL123");
const parsedOk = parseNdrSubmitResponse({
  status: 200,
  data: { upl_id: "UPL456" },
});
assert.strictEqual(parsedOk.ok, true);
assert.strictEqual(parsedOk.uplId, "UPL456");
const parsedUncertain = parseNdrSubmitResponse({ status: 200, data: {} });
assert.strictEqual(parsedUncertain.unconfirmed, true);
const parsedAuth = parseNdrSubmitResponse({ status: 401, data: {} });
assert.strictEqual(parsedAuth.confirmed, true);

console.log("delhiveryNdr.test.js: all assertions passed");