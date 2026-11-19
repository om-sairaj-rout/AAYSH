const assert = require("assert");
const {
  resolveCancelEligibility,
  buildCancelRequestBody,
  isDelhiveryMpsCancelIndividualEnabled,
} = require("../services/delhivery/delhiveryCancelShipmentValidation");
const { CANCEL_PATH } = require("../services/delhivery/delhiveryCancelShipmentApi");
const {
  verifyCancellationOnRemote,
  VERIFICATION_OUTCOME,
} = require("../services/delhivery/delhiveryCancelRemoteVerification");
const {
  getWaybillsForSafeApiRetry,
  getWaybillsForRemoteVerification,
  WAYBILL_RESULT_STATUS,
  buildWaybillResultRows,
  applyWaybillResultToRows,
  isOperationRemotelyComplete,
} = require("../services/delhivery/delhiveryCancelShipmentOperationLogic");
const { parseDelhiveryEditResponse } = require("../services/delhivery/delhiveryEditShipmentValidation");

const forward = (status, paymentMode = "COD") =>
  resolveCancelEligibility({
    delhiveryStatus: status,
    shipmentKind: "forward",
    paymentMode,
  });

assert.strictEqual(forward("Manifested").cancelable, true);
assert.strictEqual(forward("In Transit").cancelable, true);
assert.strictEqual(forward("Pending", "PREPAID").cancelable, true);
assert.strictEqual(
  resolveCancelEligibility({
    delhiveryStatus: "Scheduled",
    shipmentKind: "rvp",
    paymentMode: "PICKUP",
  }).cancelable,
  true
);
assert.strictEqual(
  resolveCancelEligibility({
    delhiveryStatus: "Manifested",
    shipmentKind: "repl",
    paymentMode: "REPL",
  }).cancelable,
  true
);

assert.strictEqual(forward("Delivered").cancelable, false);
assert.strictEqual(forward("Dispatched").cancelable, false);
assert.strictEqual(forward("RTO").cancelable, false);
assert.strictEqual(forward("Lost").cancelable, false);
assert.strictEqual(forward("Closed").cancelable, false);
assert.strictEqual(forward("Cancelled").cancelable, false);
assert.strictEqual(forward("").cancelable, false);

const body = buildCancelRequestBody("6945TEST");
assert.strictEqual(body.cancellation, "true");
assert.strictEqual(typeof body.cancellation, "string");
assert.strictEqual(CANCEL_PATH, "/api/p/edit");

const authErr = parseDelhiveryEditResponse({ status: 401, data: {} });
assert.strictEqual(authErr.confirmed, true);
assert.strictEqual(authErr.success, false);

const reject = parseDelhiveryEditResponse({
  status: 400,
  data: { success: false, error: "bad" },
});
assert.strictEqual(reject.success, false);
assert.strictEqual(reject.confirmed, true);

const timeoutLike = parseDelhiveryEditResponse({ status: 503, data: {} });
assert.strictEqual(timeoutLike.uncertain, true);

const unconfirmed = parseDelhiveryEditResponse({ status: 200, data: {} });
assert.strictEqual(unconfirmed.unconfirmed, true);

const cnTrack = {
  ShipmentData: [
    {
      Shipment: {
        Status: { Status: "Canceled", StatusType: "CN" },
      },
    },
  ],
};
assert.strictEqual(
  verifyCancellationOnRemote(cnTrack).outcome,
  VERIFICATION_OUTCOME.VERIFIED_CANCELLED
);

let rows = buildWaybillResultRows(["WB1"]);
rows = applyWaybillResultToRows(rows, "WB1", {
  status: WAYBILL_RESULT_STATUS.UNCERTAIN,
});
assert.strictEqual(getWaybillsForSafeApiRetry(rows).length, 0);
assert.strictEqual(getWaybillsForRemoteVerification(rows).length, 1);

rows = buildWaybillResultRows(["WB1"]);
rows[0].status = WAYBILL_RESULT_STATUS.SUCCEEDED;
assert.strictEqual(getWaybillsForSafeApiRetry(rows).length, 0);
assert.strictEqual(isOperationRemotelyComplete(rows), true);

const prev = process.env.DELHIVERY_MPS_CANCEL_INDIVIDUAL;
process.env.DELHIVERY_MPS_CANCEL_INDIVIDUAL = "false";
assert.strictEqual(isDelhiveryMpsCancelIndividualEnabled(), false);
process.env.DELHIVERY_MPS_CANCEL_INDIVIDUAL = prev;

console.log("delhiveryCancelShipment.test.js: all assertions passed");