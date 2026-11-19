const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const DelhiveryShipmentEditAudit = require("../../models/delhiveryShipmentEditAudit.model");
const DelhiveryShipmentEditOperation = require("../../models/delhiveryShipmentEditOperation.model");
const {
  fetchDelhiveryPackageStatus,
  fetchDelhiveryPackageTrackRaw,
} = require("./delhiveryPackageTrackApi");
const {
  verifyEditAgainstRemoteHints,
  VERIFICATION_OUTCOME,
} = require("./delhiveryEditRemoteVerification");
const { editDelhiveryShipmentWaybill } = require("./delhiveryEditShipmentApi");
const {
  buildEditPayloadDelta,
  resolveEditEligibility,
  normalizeDelhiveryPt,
  isPaymentConversionAllowed,
  sanitizeEditResponseForAudit,
} = require("./delhiveryEditShipmentValidation");
const { formatProductsDesc } = require("../../utils/delhiveryShipmentHelpers");
const {
  WAYBILL_RESULT_STATUS,
  OPERATION_STATUS,
  ACTIVE_OPERATION_STATUSES,
  buildWaybillResultRows,
  getWaybillsForSafeApiRetry,
  getWaybillsForRemoteVerification,
  isOperationRemotelyComplete,
  summarizeOperation,
  applyWaybillResultToRows,
  resolveNextOperationStatus,
  buildChangeFingerprint,
} = require("./delhiveryEditShipmentOperationLogic");

const EDIT_LOCK_TTL_MS = 15 * 60 * 1000;

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

const markShippingEditOperationState = async (shippingId, operation) => {
  const patch = {
    delhiveryEditOperationId: operation?._id || null,
    delhiveryEditOperationStatus: operation?.operationStatus || "",
  };
  if (
    operation?.operationStatus === OPERATION_STATUS.COMPLETED ||
    !operation
  ) {
    patch.delhiveryEditOperationId = null;
    patch.delhiveryEditOperationStatus = "";
  }
  await Shipping.updateOne({ _id: shippingId }, { $set: patch });
};

const loadIncompleteOperation = async (orderId) => {
  const op = await DelhiveryShipmentEditOperation.findOne({ orderId }).lean();
  if (!op) return null;
  if (!ACTIVE_OPERATION_STATUSES.has(op.operationStatus)) return null;
  return op;
};

const loadDelhiveryShipmentContext = async ({ orderId }) => {
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
      message: "Only Delhivery shipments can be edited through this API.",
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

  return {
    ok: true,
    order,
    shipping,
    waybills: collectDelhiveryWaybills(shipping),
  };
};

const buildCurrentEditSnapshot = (order, shipping) => ({
  name: order.consigneeName,
  phone: order.billingPhone,
  alternatePhone: order.billingAlternatePhone,
  address: [order.address, order.address2].filter(Boolean).join(", "),
  products_desc: formatProductsDesc(order),
  weightKg: shipping.totalWeight || order.chargeableWeight || order.weight,
  length: order.length,
  breadth: order.breadth,
  height: order.height,
  paymentMethod: order.paymentMethod,
  codAmount: order.invoiceValue,
  delhiveryShipmentType: shipping.delhiveryShipmentType || "SPS",
});

const getDelhiveryEditEligibility = async ({ orderId }) => {
  const ctx = await loadDelhiveryShipmentContext({ orderId });
  if (!ctx.ok) return ctx;

  const { order, shipping, waybills } = ctx;
  const shipmentKind = resolveShipmentKind(order, shipping);
  const incompleteOperation = await loadIncompleteOperation(order._id);

  const statusResult = await fetchDelhiveryPackageStatus(waybills[0]);
  if (!statusResult.verified) {
    return {
      ok: true,
      editable: false,
      reason:
        statusResult.message ||
        "Delhivery status could not be verified. Editing is disabled.",
      uncertain: Boolean(statusResult.uncertain),
      shipmentKind,
      current: buildCurrentEditSnapshot(order, shipping),
      waybills,
      incompleteOperation: incompleteOperation
        ? summarizeOperation(incompleteOperation)
        : null,
    };
  }

  const eligibility = resolveEditEligibility({
    delhiveryStatus: statusResult.status,
    shipmentKind,
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
    editable: (eligibility.editable || canRecover) && !lockActive,
    reason: lockActive
      ? "A Delhivery edit is already in progress for this order."
      : eligibility.editable
        ? ""
        : canRecover
          ? ""
          : eligibility.reason,
    delhiveryStatus: statusResult.status,
    shipmentKind,
    waybills,
    current: buildCurrentEditSnapshot(order, shipping),
    mps: shipping.delhiveryShipmentType === "MPS" && waybills.length > 1,
    incompleteOperation: incompleteOperation
      ? summarizeOperation(incompleteOperation)
      : null,
  };
};

const applyLocalOrderShippingUpdates = async (order, shipping, changes) => {
  if (changes.name != null) order.consigneeName = String(changes.name).trim();
  if (changes.phone != null) order.billingPhone = String(changes.phone).trim();
  if (changes.alternatePhone != null) {
    order.billingAlternatePhone = String(changes.alternatePhone).trim();
  }
  if (changes.address != null) {
    const parts = String(changes.address).split(",");
    order.address = parts[0]?.trim() || order.address;
    if (parts.length > 1) {
      order.address2 = parts.slice(1).join(",").trim();
    }
  }
  if (changes.products_desc != null) {
    order.comment = String(changes.products_desc).trim().slice(0, 240);
  }
  if (changes.weightKg != null) {
    const w = Number(changes.weightKg);
    if (Number.isFinite(w) && w > 0) {
      order.weight = w;
      order.chargeableWeight = w;
      shipping.totalWeight = w;
    }
  }
  if (changes.length != null) order.length = Number(changes.length);
  if (changes.breadth != null) order.breadth = Number(changes.breadth);
  if (changes.height != null) order.height = Number(changes.height);
  if (changes.paymentMethod != null) {
    order.paymentMethod = String(changes.paymentMethod).trim().toUpperCase();
    if (normalizeDelhiveryPt(changes.paymentMethod) === "COD") {
      order.invoiceValue = Number(changes.codAmount);
    }
  }

  await order.save();
  await shipping.save();
};

const acquireOrResumeOperation = async ({
  order,
  shipping,
  waybills,
  user,
  changes,
  paymentModeChange,
  resumeOperationId,
}) => {
  const now = Date.now();
  const lockExpiresAt = new Date(now + EDIT_LOCK_TTL_MS);
  const fingerprint = buildChangeFingerprint(changes, paymentModeChange);
  const companyID = String(order.companyID || "").trim().toUpperCase();

  if (resumeOperationId) {
    const nowDate = new Date();
    const resumed = await DelhiveryShipmentEditOperation.findOneAndUpdate(
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
          initiatedBy: user?.id || user?._id || null,
        },
      },
      { new: true }
    );
    if (!resumed) {
      return {
        ok: false,
        status: 404,
        message: "No recoverable edit operation found to resume.",
      };
    }
    return {
      ok: true,
      operation: resumed,
      resumed: true,
      delta: { payload: resumed.payloadTemplate || {} },
    };
  }

  const existing = await DelhiveryShipmentEditOperation.findOne({
    orderId: order._id,
  });
  if (
    existing &&
    existing.operationStatus === OPERATION_STATUS.IN_PROGRESS &&
    existing.lockExpiresAt &&
    new Date(existing.lockExpiresAt).getTime() > now
  ) {
    return {
      ok: false,
      status: 409,
      message: "Another Delhivery edit is in progress for this order.",
      operation: existing,
    };
  }

  const incomplete = await loadIncompleteOperation(order._id);
  if (incomplete && incomplete.lockExpiresAt && new Date(incomplete.lockExpiresAt).getTime() > now) {
    return {
      ok: false,
      status: 409,
      message:
        "Incomplete Delhivery edit requires recovery. Resume with resume_operation_id.",
      incompleteOperation: summarizeOperation(incomplete),
    };
  }

  let delta;
  try {
    delta = buildEditPayloadDelta({
      order,
      changes,
      includePaymentChange: paymentModeChange,
    });
  } catch (err) {
    return {
      ok: false,
      status: 400,
      message: err.message,
      error_code: err.code,
    };
  }

  let waybillResults = buildWaybillResultRows(waybills);
  if (
    incomplete &&
    incomplete.changeFingerprint === fingerprint &&
    incomplete.waybillResults?.length
  ) {
    waybillResults = incomplete.waybillResults.map((row) => ({ ...row }));
  }

  const lockOwnerToken = crypto.randomBytes(16).toString("hex");
  const operation = await DelhiveryShipmentEditOperation.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        companyID,
        externalOrderId: order.externalOrderId,
        operationStatus: OPERATION_STATUS.IN_PROGRESS,
        lockOwnerToken,
        lockExpiresAt,
        initiatedBy: user?.id || user?._id || null,
        changeFingerprint: fingerprint,
        paymentModeChange: Boolean(paymentModeChange),
        requestedChanges: changes,
        payloadTemplate: delta.payload,
        waybillResults,
        localSyncApplied: false,
        lastError: "",
        isMps: shipping.delhiveryShipmentType === "MPS" && waybills.length > 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await markShippingEditOperationState(shipping._id, operation);
  return { ok: true, operation, delta, resumed: Boolean(incomplete) };
};

const persistOperationWaybills = async (operationId, lockOwnerToken, rows, extra = {}) => {
  if (!lockOwnerToken) {
    const err = new Error("Lost edit operation lock.");
    err.code = "LOCK_LOST";
    throw err;
  }
  const status = resolveNextOperationStatus(rows, extra);
  const doc = await DelhiveryShipmentEditOperation.findOneAndUpdate(
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
    const err = new Error("Lost edit operation lock.");
    err.code = "LOCK_LOST";
    throw err;
  }
  return doc;
};

const reconcileUncertainWaybill = async ({
  waybill,
  payloadTemplate,
  lockOwnerToken,
  operationId,
  rows,
}) => {
  const track = await fetchDelhiveryPackageTrackRaw(waybill);
  if (!track.ok) {
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.UNCERTAIN,
      verificationOutcome: track.uncertain
        ? VERIFICATION_OUTCOME.UNAVAILABLE
        : VERIFICATION_OUTCOME.UNAVAILABLE,
      verificationMessage:
        track.message ||
        "Could not verify remote shipment state. Manual intervention required.",
      errorMessage: track.message,
    });
    return { rows, handled: true, retryApi: false };
  }

  const verification = verifyEditAgainstRemoteHints({
    payloadTemplate,
    trackRaw: track.raw,
  });

  if (verification.outcome === VERIFICATION_OUTCOME.VERIFIED_APPLIED) {
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.SUCCEEDED,
      verifiedAt: new Date(),
      verificationOutcome: verification.outcome,
      verificationMessage: verification.message,
      responseSummary: { remoteVerification: true, capabilities: verification.capabilities },
      errorMessage: "",
    });
    await persistOperationWaybills(operationId, lockOwnerToken, rows);
    return { rows, handled: true, retryApi: false };
  }

  if (verification.outcome === VERIFICATION_OUTCOME.UNCHANGED_SAFE_TO_RETRY) {
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.PENDING,
      attemptedAt: null,
      requestSentAt: null,
      definiteFailure: false,
      verificationOutcome: verification.outcome,
      verificationMessage: verification.message,
      errorMessage: "",
    });
    return { rows, handled: true, retryApi: true };
  }

  rows = applyWaybillResultToRows(rows, waybill, {
    status: WAYBILL_RESULT_STATUS.UNCERTAIN,
    verificationOutcome: verification.outcome,
    verificationMessage: verification.message,
    errorMessage:
      verification.message ||
      "Remote edit state could not be confirmed safely. Manual intervention required.",
    verifiedAt: new Date(),
  });
  return { rows, handled: true, retryApi: false };
};

const finalizeOperationIfRemoteComplete = async ({
  operation,
  order,
  shipping,
  rows,
  lockOwnerToken,
  changesToApply,
  fieldKeys,
  apiPayloads,
  apiResults,
  user,
  note,
}) => {
  if (!isOperationRemotelyComplete(rows)) {
    const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
      lastError: "Not all waybills were confirmed successful.",
    });
    await markShippingEditOperationState(shipping._id, updatedOp);
    return {
      ok: false,
      status: 502,
      message: "Delhivery edit incomplete for one or more waybills.",
      incompleteOperation: summarizeOperation(updatedOp),
    };
  }

  try {
    await applyLocalOrderShippingUpdates(order, shipping, changesToApply);
  } catch (localErr) {
    const updatedOp = await DelhiveryShipmentEditOperation.findOneAndUpdate(
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
      const err = new Error("Lost edit operation lock during local sync.");
      err.code = "LOCK_LOST";
      throw err;
    }
    await markShippingEditOperationState(shipping._id, updatedOp);
    await DelhiveryShipmentEditAudit.create({
      orderId: order._id,
      companyID: operation.companyID,
      externalOrderId: order.externalOrderId,
      performedBy: user?.id || user?._id || null,
      operationId: operation._id,
      waybills: operation.waybills,
      changedFields: fieldKeys,
      requestedValues: changesToApply,
      delhiveryPayloads: apiPayloads,
      delhiveryResponses: apiResults,
      success: false,
      uncertain: false,
      errorMessage: `Local sync failed after Delhivery success: ${localErr.message}`,
      note: String(note || "").slice(0, 500),
    });
    return {
      ok: false,
      status: 500,
      message:
        "Delhivery accepted the edit but local records could not be updated. Resume to retry local sync only.",
      incompleteOperation: summarizeOperation(updatedOp),
      localSyncFailed: true,
    };
  }

  const completedOp = await DelhiveryShipmentEditOperation.findOneAndUpdate(
    { _id: operation._id, lockOwnerToken },
    {
      $set: {
        operationStatus: OPERATION_STATUS.COMPLETED,
        localSyncApplied: true,
        waybillResults: rows,
        lockExpiresAt: null,
        lockOwnerToken: "",
        lastError: "",
      },
    },
    { new: true }
  );
  if (!completedOp) {
    return {
      ok: false,
      status: 409,
      message: "Edit operation lock lost before completion.",
    };
  }

  await markShippingEditOperationState(shipping._id, completedOp);
  await DelhiveryShipmentEditAudit.create({
    orderId: order._id,
    companyID: operation.companyID,
    externalOrderId: order.externalOrderId,
    performedBy: user?.id || user?._id || null,
    operationId: operation._id,
    waybills: operation.waybills,
    changedFields: fieldKeys,
    requestedValues: changesToApply,
    delhiveryPayloads: apiPayloads,
    delhiveryResponses: apiResults,
    success: true,
    errorMessage: "",
    note: String(note || "").slice(0, 500),
  });

  return {
    ok: true,
    message: "Delhivery shipment updated successfully.",
    updated_waybills: operation.waybills,
    changedFields: fieldKeys,
    localUpdated: true,
    operationStatus: OPERATION_STATUS.COMPLETED,
  };
};

const submitDelhiveryShipmentEdit = async ({
  orderId,
  user,
  changes = {},
  paymentModeChange = false,
  confirm = false,
  note = "",
  resumeOperationId = null,
}) => {
  if (confirm !== true) {
    return {
      ok: false,
      status: 400,
      message: "Set confirm: true to submit the Delhivery shipment edit.",
    };
  }

  const ctx = await loadDelhiveryShipmentContext({ orderId });
  if (!ctx.ok) return ctx;

  const { order, shipping, waybills } = ctx;


  const eligibility = await getDelhiveryEditEligibility({ orderId: order._id });
  if (!resumeOperationId && !eligibility.editable) {
    return {
      ok: false,
      status: 400,
      message: eligibility.reason || "Shipment is not editable.",
    };
  }

  if (paymentModeChange) {
    const conv = isPaymentConversionAllowed(
      order.paymentMethod,
      changes.paymentMethod,
      changes.codAmount
    );
    if (!conv.ok) {
      return { ok: false, status: 400, message: conv.message };
    }
  }

  const acquired = await acquireOrResumeOperation({
    order,
    shipping,
    waybills,
    user,
    changes,
    paymentModeChange,
    resumeOperationId,
  });
  if (!acquired.ok) return acquired;

  const { operation, delta } = acquired;
  const lockOwnerToken = operation.lockOwnerToken;
  let rows = operation.waybillResults.map((r) => ({ ...r }));

  const payloadTemplate = delta?.payload || operation.payloadTemplate || {};
  const fieldKeys = Object.keys(payloadTemplate).filter((k) => k !== "waybill");
  const changesToApply = resumeOperationId
    ? operation.requestedChanges
    : changes;

  if (!fieldKeys.length && !resumeOperationId) {
    return {
      ok: false,
      status: 400,
      message: "No shipment fields were changed.",
    };
  }

  const apiPayloads = [];
  const apiResults = [];

  if (isOperationRemotelyComplete(rows)) {
    return finalizeOperationIfRemoteComplete({
      operation,
      order,
      shipping,
      rows,
      lockOwnerToken,
      changesToApply,
      fieldKeys,
      apiPayloads,
      apiResults,
      user,
      note,
    });
  }

  const needsVerify = getWaybillsForRemoteVerification(rows);
  for (const row of needsVerify) {
    const recon = await reconcileUncertainWaybill({
      waybill: row.waybill,
      payloadTemplate,
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
    return finalizeOperationIfRemoteComplete({
      operation,
      order,
      shipping,
      rows,
      lockOwnerToken,
      changesToApply,
      fieldKeys,
      apiPayloads,
      apiResults,
      user,
      note,
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
        "Edit recovery requires manual verification.",
    });
    await markShippingEditOperationState(shipping._id, updatedOp);
    return {
      ok: false,
      status: 409,
      uncertain: updatedOp.operationStatus === OPERATION_STATUS.UNCERTAIN,
      message:
        "Remote edit state could not be confirmed safely. Verify on Delhivery or retry when safe.",
      incompleteOperation: summarizeOperation(updatedOp),
    };
  }

  for (const row of safeRetries) {
    const waybill = row.waybill;
    const attemptedAt = new Date();
    const requestSentAt = new Date();
    rows = applyWaybillResultToRows(rows, waybill, {
      status: WAYBILL_RESULT_STATUS.REQUEST_SENT,
      attemptedAt,
      requestSentAt,
    });
    await persistOperationWaybills(operation._id, lockOwnerToken, rows);

    const payload = { ...payloadTemplate, waybill };
    apiPayloads.push(payload);
    const result = await editDelhiveryShipmentWaybill(payload);
    apiResults.push({ waybill, ...result });

    const definiteFailure =
      !result.success && result.confirmed === true && !result.uncertain;

    if (result.uncertain || result.unconfirmed) {
      rows = applyWaybillResultToRows(rows, waybill, {
        status: WAYBILL_RESULT_STATUS.UNCERTAIN,
        httpStatus: result.http_status || null,
        responseSummary: sanitizeEditResponseForAudit(result.raw),
        errorMessage: result.message || "Unconfirmed Delhivery edit outcome.",
        definiteFailure: false,
      });
      const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
        uncertain: true,
        lastError: result.message,
      });
      await markShippingEditOperationState(shipping._id, updatedOp);
      await DelhiveryShipmentEditAudit.create({
        orderId: order._id,
        companyID: operation.companyID,
        externalOrderId: order.externalOrderId,
        performedBy: user?.id || user?._id || null,
        operationId: operation._id,
        waybills,
        changedFields: fieldKeys,
        requestedValues: changesToApply,
        delhiveryPayloads: apiPayloads,
        delhiveryResponses: apiResults,
        success: false,
        uncertain: true,
        errorMessage: result.message,
        note: String(note || "").slice(0, 500),
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
        responseSummary: sanitizeEditResponseForAudit(result.raw),
        errorMessage: result.message || "Delhivery rejected the edit.",
        definiteFailure,
      });
      const updatedOp = await persistOperationWaybills(operation._id, lockOwnerToken, rows, {
        lastError: result.message,
      });
      await markShippingEditOperationState(shipping._id, updatedOp);
      await DelhiveryShipmentEditAudit.create({
        orderId: order._id,
        companyID: operation.companyID,
        externalOrderId: order.externalOrderId,
        performedBy: user?.id || user?._id || null,
        operationId: operation._id,
        waybills,
        changedFields: fieldKeys,
        requestedValues: changesToApply,
        delhiveryPayloads: apiPayloads,
        delhiveryResponses: apiResults,
        success: false,
        errorMessage: result.message,
        note: String(note || "").slice(0, 500),
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
      responseSummary: sanitizeEditResponseForAudit(result.raw),
      errorMessage: "",
      definiteFailure: false,
    });
    await persistOperationWaybills(operation._id, lockOwnerToken, rows);
  }

  return finalizeOperationIfRemoteComplete({
    operation,
    order,
    shipping,
    rows,
    lockOwnerToken,
    changesToApply,
    fieldKeys,
    apiPayloads,
    apiResults,
    user,
    note,
  });
};

const listIncompleteDelhiveryEditOperations = async ({ companyID, limit = 50 }) => {
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
  const rows = await DelhiveryShipmentEditOperation.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return rows.map(summarizeOperation);
};

module.exports = {
  EDIT_LOCK_TTL_MS,
  collectDelhiveryWaybills,
  loadDelhiveryShipmentContext,
  getDelhiveryEditEligibility,
  submitDelhiveryShipmentEdit,
  buildCurrentEditSnapshot,
  listIncompleteDelhiveryEditOperations,
  loadIncompleteOperation,
};
