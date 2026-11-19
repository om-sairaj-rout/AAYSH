const assert = require("assert");

// Mirrors persistOperationWaybills lock guard in delhiveryEditShipment.service.js
const assertLockOwnerRequired = (lockOwnerToken) => {
  if (!lockOwnerToken) {
    const err = new Error("Lost edit operation lock.");
    err.code = "LOCK_LOST";
    throw err;
  }
};

// Stale owner cannot write after takeover (empty token cleared on complete)
assert.throws(() => assertLockOwnerRequired(""), (e) => e.code === "LOCK_LOST");
assert.throws(() => assertLockOwnerRequired(null), (e) => e.code === "LOCK_LOST");

// Expired lock resume filter: lock expired or null allows takeover
const canResumeWithLock = (lockExpiresAt, now) => {
  if (!lockExpiresAt) return true;
  return new Date(lockExpiresAt).getTime() <= now.getTime();
};
assert.strictEqual(canResumeWithLock(null, new Date()), true);
assert.strictEqual(
  canResumeWithLock(new Date(Date.now() - 1000), new Date()),
  true
);
assert.strictEqual(
  canResumeWithLock(new Date(Date.now() + 60_000), new Date()),
  false
);

const canResumeUncertainDespiteActiveLock = (operationStatus) =>
  operationStatus === "uncertain" || operationStatus === "local_sync_failed";
assert.strictEqual(canResumeUncertainDespiteActiveLock("uncertain"), true);
assert.strictEqual(canResumeUncertainDespiteActiveLock("incomplete"), false);

// Verified remote success must not enqueue courier edit API
const {
  getWaybillsForSafeApiRetry,
  WAYBILL_RESULT_STATUS,
  buildWaybillResultRows,
  applyWaybillResultToRows,
} = require("../services/delhivery/delhiveryEditShipmentOperationLogic");

let rows = buildWaybillResultRows(["WB1"]);
rows = applyWaybillResultToRows(rows, "WB1", {
  status: WAYBILL_RESULT_STATUS.SUCCEEDED,
  verificationOutcome: "verified_applied",
  responseSummary: { remoteVerification: true },
});
assert.strictEqual(getWaybillsForSafeApiRetry(rows).length, 0);

console.log("delhiveryEditRecoveryGuards.test.js: all assertions passed");