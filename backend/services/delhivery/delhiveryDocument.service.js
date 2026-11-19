const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const DelhiveryShipmentManifest = require("../../models/delhiveryShipmentManifest.model");
const { fetchDelhiveryPackageDocument } = require("./delhiveryFetchDocumentApi");
const {
  validateDocType,
  DELHIVERY_DOCUMENT_TYPES,
  DOCUMENT_LABELS,
} = require("./delhiveryDocumentValidation");

const collectOrderDelhiveryWaybills = (shipping, manifest) => {
  const master = String(
    shipping?.delhiveryMasterAwb || shipping?.awbNumber || ""
  ).trim();
  const children = (shipping?.delhiveryChildAwbs || [])
    .map((w) => String(w).trim())
    .filter(Boolean);
  const pkgAwbs = (manifest?.packages || [])
    .map((p) => String(p.waybill || "").trim())
    .filter(Boolean);
  const manifestChildren = (manifest?.childAwbs || [])
    .map((w) => String(w).trim())
    .filter(Boolean);
  return [...new Set([master, ...children, ...pkgAwbs, ...manifestChildren].filter(Boolean))];
};

const loadDelhiveryDocumentContext = async ({ orderId }) => {
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
      message: "Only Delhivery shipments support courier document download.",
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

  const isMps =
    shipping.delhiveryShipmentType === "MPS" ||
    manifest?.shipmentType === "MPS" ||
    waybills.length > 1;

  return {
    ok: true,
    order,
    shipping,
    manifest,
    waybills,
    isMps,
    defaultWaybill: waybills[0],
  };
};

const listDelhiveryShipmentDocumentOptions = async ({ orderId }) => {
  const ctx = await loadDelhiveryDocumentContext({ orderId });
  if (!ctx.ok) return ctx;
  return {
    ok: true,
    waybills: ctx.waybills,
    isMps: ctx.isMps,
    documentTypes: DELHIVERY_DOCUMENT_TYPES.map((id) => ({
      id,
      label: DOCUMENT_LABELS[id] || id,
    })),
  };
};

const assertWaybillBelongsToOrder = (waybill, allowedWaybills) => {
  const wb = String(waybill || "").trim();
  if (!wb) {
    return { ok: false, status: 400, message: "waybill query parameter is required." };
  }
  if (!allowedWaybills.includes(wb)) {
    return {
      ok: false,
      status: 403,
      message: "The requested waybill does not belong to this order.",
    };
  }
  return { ok: true, waybill: wb };
};

const fetchDelhiveryShipmentDocument = async ({ orderId, docType, waybill }) => {
  const typeCheck = validateDocType(docType);
  if (!typeCheck.ok) {
    return { ok: false, status: 400, message: typeCheck.message };
  }

  const ctx = await loadDelhiveryDocumentContext({ orderId });
  if (!ctx.ok) return ctx;

  const wbCheck = assertWaybillBelongsToOrder(waybill, ctx.waybills);
  if (!wbCheck.ok) return wbCheck;

  const api = await fetchDelhiveryPackageDocument({
    waybill: wbCheck.waybill,
    docType: typeCheck.docType,
  });

  if (!api.ok) {
    const status =
      api.error_code === "AUTH_ERROR"
        ? 502
        : api.error_code === "NOT_FOUND" || api.error_code === "UNAVAILABLE"
          ? 404
          : api.error_code === "TIMEOUT"
            ? 504
            : 502;
    return {
      ok: false,
      status,
      message: api.message,
      error_code: api.error_code,
    };
  }

  return {
    ok: true,
    docType: typeCheck.docType,
    waybill: wbCheck.waybill,
    result: api,
  };
};

module.exports = {
  collectOrderDelhiveryWaybills,
  loadDelhiveryDocumentContext,
  listDelhiveryShipmentDocumentOptions,
  fetchDelhiveryShipmentDocument,
  assertWaybillBelongsToOrder,
};