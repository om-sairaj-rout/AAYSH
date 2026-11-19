const assert = require("assert");
const {
  WAYBILL_RESULT_STATUS,
  OPERATION_STATUS,
  buildWaybillResultRows,
  getWaybillsForSafeApiRetry,
  getWaybillsForRemoteVerification,
  isOperationRemotelyComplete,
  applyWaybillResultToRows,
  resolveNextOperationStatus,
  isNeverSentPending,
  isDefiniteApiRejection,
} = require("../services/delhivery/delhiveryEditShipmentOperationLogic");
const {
  parseDelhiveryEditResponse,
  isExplicitEditSuccess,
} = require("../services/delhivery/delhiveryEditShipmentValidation");

// MPS: first succeeds, second failed with definite rejection — only second in safe retry
let rows = buildWaybillResultRows(["WB1", "WB2"]);
rows = applyWaybillResultToRows(rows, "WB1", {
  status: WAYBILL_RESULT_STATUS.SUCCEEDED,
});
rows = applyWaybillResultToRows(rows, "WB2", {
  status: WAYBILL_RESULT_STATUS.FAILED,
  errorMessage: "rejected",
  definiteFailure: true,
});
assert.strictEqual(resolveNextOperationStatus(rows), OPERATION_STATUS.INCOMPLETE);
assert.strictEqual(getWaybillsForSafeApiRetry(rows).length, 1);
assert.strictEqual(getWaybillsForSafeApiRetry(rows)[0].waybill, "WB2");
assert.strictEqual(isOperationRemotelyComplete(rows), false);

// Failed without definiteFailure — not blindly retried
rows = applyWaybillResultToRows(rows, "WB2", {
  status: WAYBILL_RESULT_STATUS.FAILED,
  definiteFailure: false,
});
assert.strictEqual(getWaybillsForSafeApiRetry(rows).length, 0);

// MPS: first succeeds, second uncertain — verify only, no safe API retry
rows = buildWaybillResultRows(["WB1", "WB2"]);
rows = applyWaybillResultToRows(rows, "WB1", {
  status: WAYBILL_RESULT_STATUS.SUCCEEDED,
});
rows = applyWaybillResultToRows(rows, "WB2", {
  status: WAYBILL_RESULT_STATUS.UNCERTAIN,
});
assert.strictEqual(
  resolveNextOperationStatus(rows, { uncertain: true }),
  OPERATION_STATUS.UNCERTAIN
);
assert.strictEqual(getWaybillsForSafeApiRetry(rows).length, 0);
assert.strictEqual(getWaybillsForRemoteVerification(rows).length, 1);
assert.ok(
  getWaybillsForRemoteVerification(rows).every((r) => r.waybill === "WB2")
);

// Pending with request sent — not treated as never-sent
const pendingRow = {
  waybill: "WB3",
  status: WAYBILL_RESULT_STATUS.PENDING,
  requestSentAt: new Date(),
};
assert.strictEqual(isNeverSentPending(pendingRow), false);
assert.ok(getWaybillsForRemoteVerification([pendingRow]).length === 0);

// Pending never sent — eligible for first submit
const freshPending = {
  waybill: "WB4",
  status: WAYBILL_RESULT_STATUS.PENDING,
  attemptedAt: null,
  requestSentAt: null,
};
assert.strictEqual(isNeverSentPending(freshPending), true);
assert.strictEqual(getWaybillsForSafeApiRetry([freshPending]).length, 1);

// local_sync_failed recovery: all succeeded → no courier API queue
const syncRows = buildWaybillResultRows(["WB1"]);
syncRows[0].status = WAYBILL_RESULT_STATUS.SUCCEEDED;
assert.strictEqual(getWaybillsForSafeApiRetry(syncRows).length, 0);
assert.strictEqual(getWaybillsForRemoteVerification(syncRows).length, 0);
assert.strictEqual(isOperationRemotelyComplete(syncRows), true);

// Recovery does not repeat succeeded AWBs
rows = buildWaybillResultRows(["WB1", "WB2"]);
rows = applyWaybillResultToRows(rows, "WB1", {
  status: WAYBILL_RESULT_STATUS.SUCCEEDED,
});
rows = applyWaybillResultToRows(rows, "WB2", {
  status: WAYBILL_RESULT_STATUS.UNCERTAIN,
});
assert.ok(
  getWaybillsForSafeApiRetry(rows).every((r) => r.waybill !== "WB1")
);

// Definite API rejection helper
assert.strictEqual(
  isDefiniteApiRejection({
    status: WAYBILL_RESULT_STATUS.FAILED,
    definiteFailure: true,
  }),
  true
);

// HTTP 200 unknown structure
const unconfirmed = parseDelhiveryEditResponse({ status: 200, data: {} });
assert.strictEqual(unconfirmed.success, false);
assert.strictEqual(unconfirmed.unconfirmed, true);

// HTTP 200 confirmed success
const confirmed = parseDelhiveryEditResponse({
  status: 200,
  data: { success: true },
});
assert.strictEqual(confirmed.success, true);

// HTTP 4xx definite failure
const clientErr = parseDelhiveryEditResponse({
  status: 400,
  data: { error: "bad request" },
});
assert.strictEqual(clientErr.success, false);
assert.strictEqual(clientErr.confirmed, true);

// HTTP 5xx uncertain
const serverErr = parseDelhiveryEditResponse({ status: 503, data: {} });
assert.strictEqual(serverErr.uncertain, true);

assert.strictEqual(isExplicitEditSuccess({ success: true }), true);

console.log("delhiveryEditShipmentOperation.test.js: all assertions passed");