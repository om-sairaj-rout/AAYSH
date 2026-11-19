const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const DelhiveryShipmentCancellationOperation = require("../../models/delhiveryShipmentCancellationOperation.model");
const DelhiveryShipmentCancelAudit = require("../../models/delhiveryShipmentCancelAudit.model");
const {
  fetchDelhiveryPackageStatus,
  fetchDelhiveryPackageTrackRaw,
} = require("./delhiveryPackageTrackApi");
const {
  cancelDelhiveryShipmentWaybill,
  sanitizeCancelResponseForAudit,
} = require("./delhiveryCancelShipmentApi");
const {
  resolveCancelEligibility,
  isDelhiveryMpsCancelIndividualEnabled,
  buildCancelRequestBody,
} = require("./delhiveryCancelShipmentValidation");
const {
  verifyCancellationOnRemote,
  VERIFICATION_OUTCOME,
} = require("./delhiveryCancelRemoteVerification");
const {
  WAYBILL_RESULT_STATUS,
  OPERATION_STATUS,
  ACTIVE_OPERATION_STATUSES,
  buildWaybillResultRows,
  getWaybillsForSafeApiRetry,
  getWaybillsForRemoteVerification,
  isOperationRemotelyComplete,
  applyWaybillResultToRows,
  resolveNextOperationStatus,
  summarizeOperation,
} = require("./delhiveryCancelShipmentOperationLogic");

const CANCEL_LOCK_TTL_MS = 15 * 60 * 1000;

const resolveShipmentKind = (order, shipping) => {
  if (order?.isReversePickup) return "rvp";
  if (String(shipping?.courierName || "").toLowerCase().includes("repl")) {
    return "repl";
  }
  return "forward";
};

const collectDelhiveryWaybills = (shipping) => {
  const master = String(
    shipping?.delhiveryMasterAwb || shipping?.awbNumber || ""
  ).trim();
  const children = (shipping?.delhiveryChildAwbs || [])
    .map((w) => String(w).trim())
    .filter(Boolean);
  return [...new Set([master, ...children].filter(Boolean))];
};

const markShippingCancelOperationState = async (shippingId, operation) => {
  const patch = {
    delhiveryCancelOperationId: operation?._id || null,
    delhiveryCancelOperationStatus: operation?.operationStatus || "",
  };
  if (
    operation?.operationStatus === OPERATION_STATUS.COMPLETED ||
    !operation
  ) {
    patch.delhiveryCancelOperationId = null;
    patch.delhiveryCancelOperationStatus = "";
  }
  await Shipping.updateOne({ _id: shippingId }, { $set: patch });
};

const loadIncompleteCancelOperation = async (orderId) => {
  const op = await DelhiveryShipmentCancellationOperation.findOne({ orderId }).lean();
  if (!op) return null;
  if (!ACTIVE_OPERATION_STATUSES.has(op.operationStatus)) return null;
  return op;
};

const loadDelhiveryCancelContext = async ({ orderId }) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return { ok: false, status: 400, message: "Invalid orderId" };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return { ok: false, status: 404, message: "Order not found" };
  }

  const shipping = await Shipping.findOne({ orderId: order._id });
  if (!shipping) {
    return { ok: false, status: 404, message: "Shipping record not found" };
  }

  if (String(shipping.courierName || "").trim() !== "Delhivery") {
    return {
      ok: false,
      status: 400,
      message: "Only Delhivery shipments can be cancelled through this API.",
    };
  }

  const awb = String(shipping.awbNumber || "").trim();
  if (!awb || shipping.delhiveryManifestStatus !== "success") {
    return {
      ok: false,
      status: 400,
      message: "Shipment does not have a confirmed Delhivery AWB.",
    };
  }

  const waybills = collectDelhiveryWaybills(shipping);
  const isMps = shipping.delhiveryShipmentType === "MPS" && waybills.length > 1;

  return {
    ok: true,
    order,
    shipping,
    waybills,
    isMps,
    shipmentKind: resolveShipmentKind(order, shipping),
    paymentMode: String(order.paymentMethod || "").trim().toUpperCase(),
  };
};

const resolveMpsCancelPlan = ({ isMps, waybills }) => {
  if (!isMps) {
    return { ok: true, waybillsToCancel: waybills.slice(0, 1), isMps: false };
  }
  if (!isDelhiveryMpsCancelIndividualEnabled()) {
    return {
      ok: false,
      reason:
        "MPS cancellation requires per-package confirmation on Delhivery. Set DELHIVERY_MPS_CANCEL_INDIVIDUAL=true only after staging verification.",
    };
  }
  return {
    ok: true,
    waybillsToCancel: waybills,
    isMps: true,
    mpsCancelMode: "individual_per_awb",
  };
};

const getDelhiveryCancelEligibility = async ({ orderId }) => {
  const ctx = await loadDelhiveryCancelContext({ orderId });
  if (!ctx.ok) return ctx;

  const { order, shipping, waybills, isMps, shipmentKind, paymentMode } = ctx;
  const incompleteOperation = await loadIncompleteCancelOperation(order._id);

  const mpsPlan = resolveMpsCancelPlan({ isMps, waybills });
  if (!mpsPlan.ok) {
    return {
      ok: true,
      cancelable: false,
      reason: mpsPlan.reason,
      shipmentKind,
      paymentMode,
      waybills,
      mps: isMps,
      incompleteOperation: incompleteOperation
        ? summarizeOperation(incompleteOperation)
        : null,
    };
  }

  const statusResult = await fetchDelhiveryPackageStatus(waybills[0]);
  if (!statusResult.verified) {
    return {
      ok: true,
      cancelable: false,
      reason:
        statusResult.message ||
        "Delhivery status could not be verified. Cancellation is blocked.",
      uncertain: Boolean(statusResult.uncertain),
      shipmentKind,
      paymentMode,
      waybills,
      incompleteOperation: incompleteOperation
        ? summarizeOperation(incompleteOperation)
        : null,
    };
  }

  const eligibility = resolveCancelEligibility({
    delhiveryStatus: statusResult.status,
    shipmentKind,
    paymentMode,
  });

  const lockActive =
    incompleteOperation &&
    incompleteOperation.lockExpiresAt &&
    new Date(incompleteOperation.lockExpiresAt).getTime() > Date.now() &&
    incompleteOperation.operationStatus === OPERATION_STATUS.IN_PROGRESS;

  const canRecover =
    incompleteOperation &&
    summarizeOperation(incompleteOperation).requiresRecovery;

  return {
    ok: true,
    cancelable: (eligibility.cancelable || canRecover) && !lockActive,
    reason: lockActive
      ? "A Delhivery cancellation is already in progress for this order."
      : eligibility.cancelable
        ? ""
        : canRecover
          ? ""
          : eligibility.reason,
    delhiveryStatus: statusResult.status,
    shipmentKind,
    paymentMode,
    waybills: mpsPlan.waybillsToCancel,
    mps: isMps,
    mpsCancelMode: mpsPlan.mpsCancelMode || "",
    incompleteOperation: incompleteOperation
      ? summarizeOperation(incompleteOperation)
      : null,
  };
};

const applyLocalCancellationSync = async (shipping, operation) => {
  shipping.delhiveryCourierCancellationConfirmedAt = new Date();
  shipping.delhiveryCancelOperationId = null;
  shipping.delhiveryCancelOperationStatus = "";
  await shipping.save();
  await DelhiveryShipmentCancellationOperation.updateOne(
    { _id: operation._id },
    { $set: { completedAt: new Date() } }
  );
};

const persistOperationWaybills = async (operationId, lockOwnerToken, rows, extra = {}) => {
  if (!lockOwnerToken) {
    const err = new Error("Lost cancellation operation lock.");
    err.code = "LOCK_LOST";
    throw err;
  }
  const status = resolveNextOperationStatus(rows, extra);
  const doc = await DelhiveryShipmentCancellationOperation.findOneAndUpdate(
    { _id: operationId, lockOwnerToken },
    {
      $set: {
        waybillResults: rows,
        operationStatus: status,
        lastError: extra.lastError || "",
        ...extra.patch,
      },
    },
    { new: true }
  );
  if (!doc) {
    const err = new Error("Lost cancellation operation lock.");
    err.code = "LOCK_LOST";
    throw err;
  }
  return doc;
};

const reconcileUncertainCancelWaybill = async ({
  waybill,
  lockOwnerToken,
  operationId,
  rows,
}) => {
  const track = await fetchDelhiveryPackageTrackRaw(waybill);
  if (!track.ok) {
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.UNCERTAIN,
      verificationOutcome: VERIFICATION_OUTCOME.UNAVAILABLE,
      verificationMessage:
        track.message ||
        "Could not verify remote cancellation state. Manual intervention required.",
      errorMessage: track.message,
    });
    return { rows, handled: true };
  }

  const verification = verifyCancellationOnRemote(track.raw);
  if (verification.outcome === VERIFICATION_OUTCOME.VERIFIED_CANCELLED) {
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.SUCCEEDED,
      verifiedAt: new Date(),
      completedAt: new Date(),
      verificationOutcome: verification.outcome,
      verificationMessage: verification.message,
      responseSummary: { remoteVerification: true },
      errorMessage: "",
    });
    await persistOperationWaybills(operationId, lockOwnerToken, rows);
    return { rows, handled: true };
  }

  rows = applyWaybillResultToRows(rows, waybill, {
    status: WAYBILL_RESULT_STATUS.UNCERTAIN,
    verificationOutcome: verification.outcome,
    verificationMessage: verification.message,
    errorMessage:
      verification.message ||
      "Cancellation could not be verified remotely. Manual review required.",
    verifiedAt: new Date(),
  });
  return { rows, handled: true };
};

const acquireOrResumeCancelOperation = async ({
  order,
  shipping,
  waybills,
  user,
  shipmentKind,
  paymentMode,
  isMps,
  mpsCancelMode,
  note,
  resumeOperationId,
}) => {
  const now = Date.now();
  const lockExpiresAt = new Date(now + CANCEL_LOCK_TTL_MS);
  const companyID = String(order.companyID || "").trim().toUpperCase();

  if (resumeOperationId) {
    const nowDate = new Date();
    const resumed = await DelhiveryShipmentCancellationOperation.findOneAndUpdate(
      {
        _id: resumeOperationId,
        orderId: order._id,
        companyID,
        operationStatus: {
          $in: [
            OPERATION_STATUS.INCOMPLETE,
            OPERATION_STATUS.UNCERTAIN,
            OPERATION_STATUS.LOCAL_SYNC_FAILED,
          ],
        },
        $or: [
          { lockExpiresAt: { $lte: nowDate } },
          { lockExpiresAt: null },
          { operationStatus: OPERATION_STATUS.UNCERTAIN },
          { operationStatus: OPERATION_STATUS.LOCAL_SYNC_FAILED },
        ],
      },
      {
        $set: {
          operationStatus: OPERATION_STATUS.IN_PROGRESS,
          lockOwnerToken: crypto.randomBytes(16).toString("hex"),
          lockExpiresAt,
          userId: user?.id || user?._id || null,
        },
      },
      { new: true }
    );
    if (!resumed) {
      return {
        ok: false,
        status: 404,
        message: "No recoverable cancellation operation found to resume.",
      };
    }
    return { ok: true, operation: resumed, resumed: true };
  }

  const existingInProgress = await DelhiveryShipmentCancellationOperation.findOne({
    orderId: order._id,
    operationStatus: OPERATION_STATUS.IN_PROGRESS,
    lockExpiresAt: { $gt: new Date() },
  });
  if (existingInProgress) {
    return {
      ok: false,
      status: 409,
      message: "Another Delhivery cancellation is in progress for this order.",
      operation: existingInProgress,
    };
  }

  const incomplete = await loadIncompleteCancelOperation(order._id);
  if (
    incomplete &&
    incomplete.lockExpiresAt &&
    new Date(incomplete.lockExpiresAt).getTime() > now &&
    incomplete.operationStatus === OPERATION_STATUS.IN_PROGRESS
  ) {
    return {
      ok: false,
      status: 409,
      message:
        "Incomplete cancellation requires recovery. Resume with resume_operation_id.",
      incompleteOperation: summarizeOperation(incomplete),
    };
  }

  let waybillResults = buildWaybillResultRows(waybills);
  if (incomplete?.waybillResults?.length === waybills.length) {
    waybillResults = incomplete.waybillResults.map((r) => ({ ...r }));
  }

  const lockOwnerToken = crypto.randomBytes(16).toString("hex");
  const operation = await DelhiveryShipmentCancellationOperation.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        companyID,
        externalOrderId: order.externalOrderId,
        operationStatus: OPERATION_STATUS.IN_PROGRESS,
        lockOwnerToken,
        lockExpiresAt,
        userId: user?.id || user?._id || null,
        shipmentType: shipmentKind,
        paymentMode,
        waybills,
        waybillResults,
        localSyncApplied: false,
        lastError: "",
        note: String(note || "").slice(0, 500),
        isMps,
        mpsCancelMode: mpsCancelMode || "",
        apiResponse: null,
        completedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await markShippingCancelOperationState(shipping._id, operation);
  return { ok: true, operation, resumed: Boolean(incomplete) };
};

const finalizeCancelOperation = async ({
  operation,
  order,
  shipping,
  rows,
  lockOwnerToken,
  apiResults,
  user,
  note,
  delhiveryStatusAtSubmit,
}) => {
  if (!isOperationRemotelyComplete(rows)) {
    const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
      lastError: "Not all waybills were confirmed cancelled.",
    });
    await markShippingCancelOperationState(shipping._id, updatedOp);
    return {
      ok: false,
      status: 502,
      message: "Delhivery cancellation incomplete for one or more waybills.",
      incompleteOperation: summarizeOperation(updatedOp),
    };
  }

  try {
    await applyLocalCancellationSync(shipping, operation);
  } catch (localErr) {
    const updatedOp = await DelhiveryShipmentCancellationOperation.findOneAndUpdate(
      { _id: operation._id, lockOwnerToken },
      {
        $set: {
          operationStatus: OPERATION_STATUS.LOCAL_SYNC_FAILED,
          lastError: localErr.message,
          waybillResults: rows,
        },
      },
      { new: true }
    );
    if (!updatedOp) {
      const err = new Error("Lost cancellation lock during local sync.");
      err.code = "LOCK_LOST";
      throw err;
    }
    await markShippingCancelOperationState(shipping._id, updatedOp);
    await DelhiveryShipmentCancelAudit.create({
      orderId: order._id,
      companyID: operation.companyID,
      externalOrderId: order.externalOrderId,
      performedBy: user?.id || user?._id || null,
      operationId: operation._id,
      waybills: operation.waybills,
      delhiveryResponses: apiResults,
      success: false,
      uncertain: false,
      errorMessage: `Local sync failed after Delhivery cancellation: ${localErr.message}`,
      note: String(note || "").slice(0, 500),
      delhiveryStatusAtSubmit,
    });
    return {
      ok: false,
      status: 500,
      message:
        "Delhivery accepted cancellation but local records could not be updated. Resume to retry local sync only.",
      incompleteOperation: summarizeOperation(updatedOp),
      localSyncFailed: true,
    };
  }

  const completedOp = await DelhiveryShipmentCancellationOperation.findOneAndUpdate(
    { _id: operation._id, lockOwnerToken },
    {
      $set: {
        operationStatus: OPERATION_STATUS.COMPLETED,
        localSyncApplied: true,
        waybillResults: rows,
        lockExpiresAt: null,
        lockOwnerToken: "",
        lastError: "",
        completedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!completedOp) {
    return {
      ok: false,
      status: 409,
      message: "Cancellation operation lock lost before completion.",
    };
  }

  await markShippingCancelOperationState(shipping._id, completedOp);
  await DelhiveryShipmentCancelAudit.create({
    orderId: order._id,
    companyID: operation.companyID,
    externalOrderId: order.externalOrderId,
    performedBy: user?.id || user?._id || null,
    operationId: operation._id,
    waybills: operation.waybills,
    delhiveryResponses: apiResults,
    success: true,
    errorMessage: "",
    note: String(note || "").slice(0, 500),
    delhiveryStatusAtSubmit,
  });

  return {
    ok: true,
    message:
      "Delhivery cancellation submitted and recorded. Tracking may show UD, RT, or CN depending on prior status.",
    updated_waybills: operation.waybills,
    localUpdated: true,
    operationStatus: OPERATION_STATUS.COMPLETED,
  };
};

const submitDelhiveryShipmentCancel = async ({
  orderId,
  user,
  confirm = false,
  note = "",
  resumeOperationId = null,
}) => {
  if (confirm !== true) {
    return {
      ok: false,
      status: 400,
      message: "Set confirm: true to submit Delhivery shipment cancellation.",
    };
  }

  const ctx = await loadDelhiveryCancelContext({ orderId });
  if (!ctx.ok) return ctx;

  const { order, shipping, waybills, isMps, shipmentKind, paymentMode } = ctx;
  const mpsPlan = resolveMpsCancelPlan({ isMps, waybills });
  if (!mpsPlan.ok) {
    return { ok: false, status: 400, message: mpsPlan.reason };
  }

  const eligibility = await getDelhiveryCancelEligibility({ orderId: order._id });
  if (!resumeOperationId && !eligibility.cancelable) {
    return {
      ok: false,
      status: 400,
      message: eligibility.reason || "Shipment is not cancellable.",
    };
  }

  const acquired = await acquireOrResumeCancelOperation({
    order,
    shipping,
    waybills: mpsPlan.waybillsToCancel,
    user,
    shipmentKind,
    paymentMode,
    isMps,
    mpsCancelMode: mpsPlan.mpsCancelMode,
    note,
    resumeOperationId,
  });
  if (!acquired.ok) return acquired;

  const { operation } = acquired;
  const lockOwnerToken = operation.lockOwnerToken;
  let rows = operation.waybillResults.map((r) => ({ ...r }));
  const apiResults = [];
  const delhiveryStatusAtSubmit = eligibility.delhiveryStatus || "";

  if (isOperationRemotelyComplete(rows)) {
    return finalizeCancelOperation({
      operation,
      order,
      shipping,
      rows,
      lockOwnerToken,
      apiResults,
      user,
      note,
      delhiveryStatusAtSubmit,
    });
  }

  for (const row of getWaybillsForRemoteVerification(rows)) {
    const recon = await reconcileUncertainCancelWaybill({
      waybill: row.waybill,
      lockOwnerToken,
      operationId: operation._id,
      rows,
    });
    rows = recon.rows;
    if (recon.handled) {
      await persistOperationWaybills(operation._id, lockOwnerToken, rows);
    }
  }

  if (isOperationRemotelyComplete(rows)) {
    return finalizeCancelOperation({
      operation,
      order,
      shipping,
      rows,
      lockOwnerToken,
      apiResults,
      user,
      note,
      delhiveryStatusAtSubmit,
    });
  }

  const safeRetries = getWaybillsForSafeApiRetry(rows);
  const stillBlocked = rows.filter(
    (r) =>
      r.status === WAYBILL_RESULT_STATUS.UNCERTAIN ||
      (r.status === WAYBILL_RESULT_STATUS.FAILED && !r.definiteFailure) ||
      r.status === WAYBILL_RESULT_STATUS.REQUEST_SENT
  );

  if (!safeRetries.length && stillBlocked.length) {
    const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
      uncertain: stillBlocked.some(
        (r) => r.status === WAYBILL_RESULT_STATUS.UNCERTAIN
      ),
      lastError:
        stillBlocked[0]?.verificationMessage ||
        stillBlocked[0]?.errorMessage ||
        "Cancellation recovery requires manual verification.",
    });
    await markShippingCancelOperationState(shipping._id, updatedOp);
    return {
      ok: false,
      status: 409,
      uncertain: updatedOp.operationStatus === OPERATION_STATUS.UNCERTAIN,
      message:
        "Cancellation state could not be confirmed safely. Verify on Delhivery or retry when eligible.",
      incompleteOperation: summarizeOperation(updatedOp),
    };
  }

  for (const row of safeRetries) {
    const waybill = row.waybill;
    const requestSentAt = new Date();
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.REQUEST_SENT,
      requestSentAt,
    });
    await persistOperationWaybills(operation._id, lockOwnerToken, rows);

    const bodyCheck = buildCancelRequestBody(waybill);
    const result = await cancelDelhiveryShipmentWaybill(waybill);
    apiResults.push({
      waybill,
      requestBody: bodyCheck,
      ...result,
      raw: sanitizeCancelResponseForAudit(result.raw),
    });

    const definiteFailure =
      !result.success && result.confirmed === true && !result.uncertain;

    if (result.uncertain || result.unconfirmed) {
      rows = applyWaybillResultToRows(rows, waybill, {
        status: WAYBILL_RESULT_STATUS.UNCERTAIN,
        httpStatus: result.http_status || null,
        responseSummary: sanitizeCancelResponseForAudit(result.raw),
        errorMessage: result.message || "Unconfirmed Delhivery cancellation outcome.",
        definiteFailure: false,
      });
      const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
        uncertain: true,
        lastError: result.message,
        patch: { apiResponse: sanitizeCancelResponseForAudit(result.raw) },
      });
      await markShippingCancelOperationState(shipping._id, updatedOp);
      await DelhiveryShipmentCancelAudit.create({
        orderId: order._id,
        companyID: operation.companyID,
        externalOrderId: order.externalOrderId,
        performedBy: user?.id || user?._id || null,
        operationId: operation._id,
        waybills: operation.waybills,
        delhiveryResponses: apiResults,
        success: false,
        uncertain: true,
        errorMessage: result.message,
        note: String(note || "").slice(0, 500),
        delhiveryStatusAtSubmit,
      });
      return {
        ok: false,
        status: 504,
        uncertain: true,
        message: result.message,
        incompleteOperation: summarizeOperation(updatedOp),
        failed_waybill: waybill,
      };
    }

    if (!result.success) {
      rows = applyWaybillResultToRows(rows, waybill, {
        status: WAYBILL_RESULT_STATUS.FAILED,
        httpStatus: result.http_status || null,
        responseSummary: sanitizeCancelResponseForAudit(result.raw),
        errorMessage: result.message || "Delhivery rejected cancellation.",
        definiteFailure,
      });
      const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
        lastError: result.message,
      });
      await markShippingCancelOperationState(shipping._id, updatedOp);
      await DelhiveryShipmentCancelAudit.create({
        orderId: order._id,
        companyID: operation.companyID,
        externalOrderId: order.externalOrderId,
        performedBy: user?.id || user?._id || null,
        operationId: operation._id,
        waybills: operation.waybills,
        delhiveryResponses: apiResults,
        success: false,
        errorMessage: result.message,
        note: String(note || "").slice(0, 500),
        delhiveryStatusAtSubmit,
      });
      return {
        ok: false,
        status: 502,
        message: result.message,
        incompleteOperation: summarizeOperation(updatedOp),
        failed_waybill: waybill,
      };
    }

    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.SUCCEEDED,
      httpStatus: result.http_status || null,
      responseSummary: sanitizeCancelResponseForAudit(result.raw),
      errorMessage: "",
      definiteFailure: false,
      completedAt: new Date(),
    });
    await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
      patch: { apiResponse: sanitizeCancelResponseForAudit(result.raw) },
    });
  }

  return finalizeCancelOperation({
    operation,
    order,
    shipping,
    rows,
    lockOwnerToken,
    apiResults,
    user,
    note,
    delhiveryStatusAtSubmit,
  });
};

const listIncompleteDelhiveryCancelOperations = async ({ companyID, limit = 50 }) => {
  const filter = {
    operationStatus: {
      $in: [
        OPERATION_STATUS.INCOMPLETE,
        OPERATION_STATUS.UNCERTAIN,
        OPERATION_STATUS.LOCAL_SYNC_FAILED,
        OPERATION_STATUS.IN_PROGRESS,
      ],
    },
  };
  if (companyID) {
    filter.companyID = String(companyID).trim().toUpperCase();
  }
  const rows = await DelhiveryShipmentCancellationOperation.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return rows.map(summarizeOperation);
};

module.exports = {
  CANCEL_LOCK_TTL_MS,
  getDelhiveryCancelEligibility,
  submitDelhiveryShipmentCancel,
  listIncompleteDelhiveryCancelOperations,
  buildCancelRequestBody,
  resolveCancelEligibility,
  loadDelhiveryCancelContext,
};