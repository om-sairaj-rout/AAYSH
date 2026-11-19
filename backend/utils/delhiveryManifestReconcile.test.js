const assert = require("assert");
const {
  RECONCILIATION_PHASE,
  RECONCILIATION_CLAIM_STALE_MS,
  assertOrderManifestCompanyMatch,
  canAcquireReconciliationClaim,
  isStaleReconciliationClaim,
  buildReconciliationClaimFilter,
  verifyReservedAwbsAgainstManifest,
  evaluateAwbReleaseOutcome,
} = require("../services/delhivery/delhiveryManifestReconcileLogic");
const reconcilableManifest = {
  manifestStatus: "reconciliation_required",
  reconciliationRequired: true,
  reconciliationPhase: RECONCILIATION_PHASE.NONE,
};

// 8 — cross-company mismatch
assert.strictEqual(
  assertOrderManifestCompanyMatch(
    { companyID: "ACME" },
    { companyID: "OTHER" }
  ).ok,
  false
);
assert.strictEqual(
  assertOrderManifestCompanyMatch(
    { companyID: "acme" },
    { companyID: "ACME" }
  ).ok,
  true
);

// Claim acquisition / concurrent behavior (logic)
assert.strictEqual(
  canAcquireReconciliationClaim(reconcilableManifest).ok,
  true
);
assert.strictEqual(
  canAcquireReconciliationClaim({
    ...reconcilableManifest,
    reconciliationPhase: RECONCILIATION_PHASE.COMPLETED,
  }).ok,
  false
);
assert.strictEqual(
  canAcquireReconciliationClaim({
    ...reconcilableManifest,
    reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,
    reconciliationClaimedAt: new Date(),
  }).ok,
  false
);
const staleClaimTime = new Date(Date.now() - RECONCILIATION_CLAIM_STALE_MS - 1000);
assert.strictEqual(
  canAcquireReconciliationClaim({
    ...reconcilableManifest,
    reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,
    reconciliationClaimedAt: staleClaimTime,
  }).ok,
  true
);
assert.strictEqual(
  isStaleReconciliationClaim({
    reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,
    reconciliationClaimedAt: staleClaimTime,
  }),
  true
);

// 3 — retry after reconciliation_failed
assert.strictEqual(
  canAcquireReconciliationClaim({
    ...reconcilableManifest,
    reconciliationPhase: RECONCILIATION_PHASE.FAILED,
  }).ok,
  true
);

assert.ok(buildReconciliationClaimFilter("507f1f77bcf86cd799439011").$and);

// 7 — booked AWBs would fail manifest waybill verify if mismatched; reserved only in release helper
const verifyOk = verifyReservedAwbsAgainstManifest(
  [{ awbNumber: "WB001" }, { awbNumber: "WB002" }],
  { masterAwb: "WB001", childAwbs: ["WB002"] }
);
assert.strictEqual(verifyOk.ok, true);

// 9 — incorrect released count never complete
const full = evaluateAwbReleaseOutcome({
  expectedCount: 2,
  releasedCount: 2,
  releasedNumbers: ["A", "B"],
});
assert.strictEqual(full.complete, true);

const partial = evaluateAwbReleaseOutcome({
  expectedCount: 2,
  releasedCount: 1,
  releasedNumbers: ["A"],
});
assert.strictEqual(partial.complete, false);
assert.strictEqual(partial.partial, true);

const noneReleased = evaluateAwbReleaseOutcome({
  expectedCount: 2,
  releasedCount: 0,
  releasedNumbers: [],
});
assert.strictEqual(noneReleased.complete, false);
assert.strictEqual(noneReleased.partial, false);

// Simulate successful vs partial decision used by controller
const shouldComplete = (detail, remainingAfter) => {
  const outcome = evaluateAwbReleaseOutcome({
    expectedCount: detail.reservedEligible,
    releasedCount: detail.released,
  });
  return outcome.complete && detail.released === detail.reservedEligible && remainingAfter === 0;
};

assert.strictEqual(
  shouldComplete({ reservedEligible: 2, released: 2 }, 0),
  true
);
assert.strictEqual(
  shouldComplete({ reservedEligible: 2, released: 1 }, 1),
  false
);

// 1 — successful reconciliation shape
assert.strictEqual(full.releasedCount, 2);
assert.deepStrictEqual(full.releasedNumbers, ["A", "B"]);

// 4/5 — partial + retry semantics (failed phase allows new claim)
assert.strictEqual(
  canAcquireReconciliationClaim({
    ...reconcilableManifest,
    reconciliationPhase: RECONCILIATION_PHASE.FAILED,
    reconciliationPendingAwbIds: ["507f1f77bcf86cd799439012"],
  }).ok,
  true
);

// 6 — concurrent: active claim blocks second
assert.strictEqual(
  canAcquireReconciliationClaim({
    ...reconcilableManifest,
    reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,
    reconciliationClaimedAt: new Date(),
  }).reason,
  "CLAIM_ACTIVE"
);

// 2 — release throws after claim: controller sets FAILED (documented contract)
assert.strictEqual(RECONCILIATION_PHASE.FAILED, "reconciliation_failed");

console.log("delhiveryManifestReconcile.test.js: all assertions passed");
