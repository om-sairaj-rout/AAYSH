const assert = require("assert");
const {
  resolveDelhiveryManifestWalletAction,
  shouldReleaseReservedAwbsOnManifestCatch,
} = require("./delhiveryManifestWalletPolicy");
const {
  mapDelhiveryTransportError,
  mapDelhiveryHttpResponse,
} = require("../services/delhivery/delhiveryCreateShipmentApi");
const { resolvePickupCompletionAwbRouting } = require("./completePickupSchedule");

// FIX 3 — wallet policy
assert.deepStrictEqual(resolveDelhiveryManifestWalletAction({ success: true }), {
  reverse: false,
  reconcile: false,
});

assert.deepStrictEqual(
  resolveDelhiveryManifestWalletAction({
    success: false,
    walletShouldReverse: true,
  }),
  { reverse: true, reconcile: false }
);

assert.deepStrictEqual(
  resolveDelhiveryManifestWalletAction({
    success: false,
    inProgress: true,
  }),
  { reverse: false, reconcile: false }
);

assert.deepStrictEqual(
  resolveDelhiveryManifestWalletAction({
    success: false,
    uncertain: true,
    reconciliationRequired: true,
  }),
  { reverse: false, reconcile: true }
);

assert.deepStrictEqual(
  resolveDelhiveryManifestWalletAction({
    success: false,
    definiteFailure: true,
  }),
  { reverse: true, reconcile: false }
);

// FIX 1 — AWB release guard
assert.strictEqual(
  shouldReleaseReservedAwbsOnManifestCatch({ cmuRequestWasMarked: true }),
  false
);
assert.strictEqual(
  shouldReleaseReservedAwbsOnManifestCatch({
    cmuResponseIndicatesAcceptance: true,
  }),
  false
);
assert.strictEqual(shouldReleaseReservedAwbsOnManifestCatch({}), true);

// FIX 5 — ambiguous HTTP / transport
const networkOutcome = mapDelhiveryTransportError({ code: "ECONNRESET" });
assert.strictEqual(networkOutcome.uncertain, true);
assert.strictEqual(networkOutcome.error_code, "NETWORK_ERROR");

const serverOutcome = mapDelhiveryHttpResponse({ status: 503, data: {} });
assert.strictEqual(serverOutcome.uncertain, true);
assert.strictEqual(serverOutcome.error_code, "SERVER_ERROR");

const clientReject = mapDelhiveryHttpResponse({
  status: 400,
  data: { error: "Invalid pincode" },
});
assert.strictEqual(clientReject.uncertain, undefined);
assert.strictEqual(clientReject.api_error, true);
assert.strictEqual(clientReject.error_code, "CLIENT_ERROR");

const partialMps = mapDelhiveryHttpResponse({
  status: 200,
  data: {
    packages: [
      { waybill: "A1", status: "Success" },
      { waybill: "A2", status: "Fail" },
    ],
  },
});
assert.strictEqual(partialMps.uncertain, true);
assert.strictEqual(partialMps.error_code, "PARTIAL_MPS_FAILURE");

// FIX 4 — mixed prepaid + COD pickup routing
const prepaid = { order: { _id: "p1", paymentMethod: "PREPAID", isReversePickup: false, externalOrderId: "P1" } };
const cod = { order: { _id: "c1", paymentMethod: "COD", isReversePickup: false, externalOrderId: "C1" } };
const reverse = { order: { _id: "r1", paymentMethod: "COD", isReversePickup: true, externalOrderId: "R1" } };

const mixedPlan = resolvePickupCompletionAwbRouting(
  [prepaid, cod, reverse],
  { delhiveryPickupLocationId: null }
);
assert.strictEqual(mixedPlan.codBlockedByMissingPickup, false);
assert.strictEqual(mixedPlan.ordersToAssign.length, 3);
assert.strictEqual(mixedPlan.codSkipResults.length, 0);

const fullPlan = resolvePickupCompletionAwbRouting(
  [prepaid, cod],
  { delhiveryPickupLocationId: "507f1f77bcf86cd799439011" }
);
assert.strictEqual(fullPlan.codBlockedByMissingPickup, false);
assert.strictEqual(fullPlan.ordersToAssign.length, 2);

console.log("delhiveryManifestFixes.test.js: all assertions passed");
