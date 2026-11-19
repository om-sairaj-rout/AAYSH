const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const DelhiveryShipmentManifest = require("../../models/delhiveryShipmentManifest.model");
const DelhiveryNdrAction = require("../../models/delhiveryNdrAction.model");
const { fetchDelhiveryPackageTrackRaw } = require("./delhiveryPackageTrackApi");
const { extractNdrHintsFromTrack } = require("./delhiveryNdrTrackingHints");
const {
  validateNdrAction,
  evaluateNdrEligibility,
  ACTIVE_NDR_STATUSES,
  sanitizeNdrPayloadForAudit,
} = require("./delhiveryNdrValidation");
const {
  submitDelhiveryNdrAction,
  fetchDelhiveryUplStatus,
} = require("./delhiveryNdrApi");
const {
  collectOrderDelhiveryWaybills,
  assertWaybillBelongsToOrder,
} = require("./delhiveryDocument.service");

const loadNdrContext = async (orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return { ok: false, status: 400, message: "Invalid orderId" };
  }

  const order = await Order.findById(orderId).lean();
  if (!order) return { ok: false, status: 404, message: "Order not found" };

  const shipping = await Shipping.findOne({ orderId: order._id }).lean();
  if (!shipping) return { ok: false, status: 404, message: "Shipping not found" };

  if (String(shipping.courierName || "").trim() !== "Delhivery") {
    return {
      ok: false,
      status: 400,
      message: "NDR actions are only available for Delhivery shipments.",
    };
  }

  const manifest = await DelhiveryShipmentManifest.findOne({
    orderId: order._id,
    manifestStatus: "success",
  }).lean();

  const waybills = collectOrderDelhiveryWaybills(shipping, manifest);
  if (!waybills.length) {
    return {
      ok: false,
      status: 400,
      message: "No Delhivery waybill is associated with this order.",
    };
  }

  return {
    ok: true,
    order,
    shipping,
    waybills,
    isMps: waybills.length > 1,
    companyID: String(order.companyID || "").trim().toUpperCase(),
  };
};

const getDelhiveryNdrEligibility = async ({ orderId, waybill }) => {
  const ctx = await loadNdrContext(orderId);
  if (!ctx.ok) return ctx;

  const wbCheck = assertWaybillBelongsToOrder(waybill, ctx.waybills);
  if (!wbCheck.ok) return wbCheck;

  const track = await fetchDelhiveryPackageTrackRaw(wbCheck.waybill);
  if (!track.ok) {
    return {
      ok: false,
      status: track.uncertain ? 504 : 502,
      message:
        track.message ||
        "Could not retrieve Delhivery tracking for NDR eligibility.",
      uncertain: Boolean(track.uncertain),
    };
  }

  const hints = extractNdrHintsFromTrack(track.raw);
  const eligibility = evaluateNdrEligibility({
    hints,
    order: ctx.order,
    shipping: ctx.shipping,
  });

  const open = await DelhiveryNdrAction.find({
    orderId: ctx.order._id,
    waybill: wbCheck.waybill,
    requestStatus: { $in: [...ACTIVE_NDR_STATUSES] },
  }).lean();

  return {
    ok: true,
    waybill: wbCheck.waybill,
    waybills: ctx.waybills,
    isMps: ctx.isMps,
    nslCode: hints.nslCode || "",
    nslCodes: hints.nslCodes || [],
    delhiveryStatus: hints.delhiveryStatus || "",
    attemptCount: hints.attemptCount,
    eligibleActions: eligibility.eligibleActions,
    actionReasons: eligibility.reasons,
    ineligibleReason: eligibility.reason || "",
    shipmentKind: eligibility.shipmentKind,
    openRequests: open.map((r) => ({
      id: r._id,
      action: r.action,
      requestStatus: r.requestStatus,
      uplId: r.uplId,
      submittedAt: r.submittedAt,
    })),
    afterNinePmRecommended: true,
  };
};

const submitDelhiveryNdrActionForOrder = async ({
  orderId,
  waybill,
  action,
  user,
  acknowledgeBeforeNinePm = false,
}) => {
  const actionCheck = validateNdrAction(action);
  if (!actionCheck.ok) {
    return { ok: false, status: 400, message: actionCheck.message };
  }

  const ctx = await loadNdrContext(orderId);
  if (!ctx.ok) return ctx;

  const wbCheck = assertWaybillBelongsToOrder(waybill, ctx.waybills);
  if (!wbCheck.ok) return wbCheck;

  const duplicate = await DelhiveryNdrAction.findOne({
    waybill: wbCheck.waybill,
    action: actionCheck.action,
    requestStatus: { $in: [...ACTIVE_NDR_STATUSES] },
  }).lean();
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      message:
        "An NDR request for this AWB/action is already pending or uncertain. Refresh UPL status before submitting again.",
      existing: duplicate,
    };
  }

  const track = await fetchDelhiveryPackageTrackRaw(wbCheck.waybill);
  if (!track.ok) {
    return {
      ok: false,
      status: track.uncertain ? 504 : 502,
      message: track.message || "Could not verify tracking before NDR submission.",
    };
  }

  const hints = extractNdrHintsFromTrack(track.raw);
  const eligibility = evaluateNdrEligibility({
    hints,
    order: ctx.order,
    shipping: ctx.shipping,
  });
  if (!eligibility.eligibleActions.includes(actionCheck.action)) {
    return {
      ok: false,
      status: 400,
      message:
        eligibility.reasons?.[actionCheck.action] ||
        eligibility.reason ||
        "Action is not eligible for current tracking state.",
    };
  }

  const record = await DelhiveryNdrAction.create({
    orderId: ctx.order._id,
    companyID: ctx.companyID,
    waybill: wbCheck.waybill,
    action: actionCheck.action,
    requestStatus: "submitted",
    submittedBy: user?.id || user?._id || null,
    nslCodeAtSubmit: hints.nslCode || "",
    attemptCountAtSubmit: hints.attemptCount,
    delhiveryStatusAtSubmit: hints.delhiveryStatus || "",
    acknowledgedAfter9PmIst: Boolean(acknowledgeBeforeNinePm),
  });

  const api = await submitDelhiveryNdrAction({
    waybill: wbCheck.waybill,
    action: actionCheck.action,
  });

  const patch = {
    submitRequest: sanitizeNdrPayloadForAudit(api.requestBody),
    submitResponse: sanitizeNdrPayloadForAudit(api.raw),
    lastError: api.message || "",
  };

  if (api.uncertain || api.unconfirmed) {
    await DelhiveryNdrAction.updateOne(
      { _id: record._id },
      {
        $set: {
          ...patch,
          requestStatus: "uncertain",
          uplId: api.uplId || "",
        },
      }
    );
    return {
      ok: false,
      status: 504,
      uncertain: true,
      message: api.message,
      ndrActionId: record._id,
      uplId: api.uplId || "",
      requestStatus: "uncertain",
    };
  }

  if (!api.ok) {
    await DelhiveryNdrAction.updateOne(
      { _id: record._id },
      {
        $set: {
          ...patch,
          requestStatus: api.confirmed ? "failed" : "uncertain",
        },
      }
    );
    return {
      ok: false,
      status: 502,
      message: api.message || "Delhivery rejected the NDR request.",
      ndrActionId: record._id,
      requestStatus: api.confirmed ? "failed" : "uncertain",
    };
  }

  await DelhiveryNdrAction.updateOne(
    { _id: record._id },
    {
      $set: {
        ...patch,
        uplId: api.uplId,
        requestStatus: "submitted",
        lastError: "",
      },
    }
  );

  return {
    ok: true,
    message:
      "NDR request accepted by Delhivery. UPL processing is asynchronous — refresh UPL status manually.",
    ndrActionId: record._id,
    uplId: api.uplId,
    requestStatus: "submitted",
  };
};

const refreshDelhiveryUplStatus = async ({ uplId, user, companyID }) => {
  const record = await DelhiveryNdrAction.findOne({
    $or: [{ uplId }, { _id: mongoose.isValidObjectId(uplId) ? uplId : null }],
  }).lean();
  if (!record) {
    return { ok: false, status: 404, message: "NDR action record not found." };
  }
  if (companyID && record.companyID !== String(companyID).trim().toUpperCase()) {
    return { ok: false, status: 403, message: "NDR record is outside your company." };
  }
  void user;

  const targetUpl = record.uplId;
  if (!targetUpl) {
    return {
      ok: false,
      status: 400,
      message: "No UPL ID is stored for this NDR request.",
    };
  }

  const upl = await fetchDelhiveryUplStatus(targetUpl);
  await DelhiveryNdrAction.updateOne(
    { _id: record._id },
    {
      $set: {
        uplStatusResponse: sanitizeNdrPayloadForAudit(upl.raw),
        lastUplStatusCheckAt: new Date(),
        lastError: upl.ok ? "" : upl.message || record.lastError,
      },
    }
  );

  if (!upl.ok) {
    return {
      ok: false,
      status: upl.error_code === "AUTH_ERROR" ? 502 : 502,
      message: upl.message,
    };
  }

  return {
    ok: true,
    uplId: targetUpl,
    requestStatus: record.requestStatus,
    uplStatus: upl.raw,
    lastCheckedAt: new Date(),
  };
};

const listDelhiveryNdrActionsForOrder = async (orderId) =>
  DelhiveryNdrAction.find({ orderId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

module.exports = {
  loadNdrContext,
  getDelhiveryNdrEligibility,
  submitDelhiveryNdrActionForOrder,
  refreshDelhiveryUplStatus,
  listDelhiveryNdrActionsForOrder,
};