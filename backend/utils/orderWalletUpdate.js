const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Company = require("../models/company.model");
const PincodeServiceability = require("../models/upload/serviceability.model");
const { calculateOrderWalletCharge } = require("./orderWalletCharge");
const { resolveZoneForOrder } = require("./calculateFinalOrderRate");
const {
  round2,
  assertWalletCanAfford,
  debitOrderChargeAdjustment,
  logOrderWalletFieldChange,
} = require("./walletService");
const { resolveOrderWeights } = require("./weightCalculations");
const {
  buildOrderFieldSnapshots,
  diffSnapshots,
  buildOrderChangeDescription,
} = require("./walletOrderChangeMeta");

const normalizeServiceType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "sur" || raw === "surface") return "surface";
  if (raw === "air") return "air";
  if (raw === "prime") return "prime";
  return null;
};

const resolveOrderZone = async (order) => {
  const zoneInfo = await resolveZoneForOrder({
    zone: order.category,
    order,
    PincodeServiceability,
  });
  return zoneInfo.zone || order.category || "";
};

const applyOrderWalletFieldUpdate = async ({
  order,
  shipping,
  weight,
  length,
  breadth,
  height,
  odaCharge,
  serviceType,
  createdBy = null,
}) => {
  const company = await Company.findOne({ companyID: order.companyID })
    .select("walletEnabled")
    .lean();

  if (!company?.walletEnabled) {
    return { success: true, walletSkipped: true };
  }

  const beforeService = shipping?.serviceType || "surface";
  const beforeZone = await resolveOrderZone(order);
  const beforeSnapshot = buildOrderFieldSnapshots({
    order,
    shipping,
    zone: beforeZone,
    serviceType: beforeService,
    walletChargeAmount: order.walletChargeAmount,
  });

  const weights = resolveOrderWeights({
    weight: weight ?? order.weight,
    length: length ?? order.length,
    breadth: breadth ?? order.breadth,
    height: height ?? order.height,
  });

  const normalizedService = normalizeServiceType(
    serviceType || shipping?.serviceType || "surface"
  );
  if (!normalizedService) {
    return { success: false, message: "Invalid courier mode. Use SUR, AIR, or Prime." };
  }

  const previewOrder = {
    ...order.toObject(),
    weight: weights.actualWeight,
    actualWeight: weights.actualWeight,
    volumetricWeight: weights.volumetricWeight,
    chargeableWeight: weights.chargeableWeight,
    length: length ?? order.length,
    breadth: breadth ?? order.breadth,
    height: height ?? order.height,
    odaCharge: round2(odaCharge ?? order.odaCharge ?? 0),
  };

  const chargeResult = await calculateOrderWalletCharge(
    previewOrder,
    normalizedService
  );
  if (!chargeResult.success) {
    return chargeResult;
  }

  const afterZone = chargeResult.zone || beforeZone;
  const afterSnapshot = buildOrderFieldSnapshots({
    order: previewOrder,
    shipping: {
      ...shipping?.toObject?.() || shipping,
      serviceType: normalizedService,
      awbNumber: shipping?.awbNumber,
    },
    zone: afterZone,
    serviceType: normalizedService,
    walletChargeAmount: chargeResult.amount,
  });

  const fieldChanges = diffSnapshots(beforeSnapshot, afterSnapshot);
  const previousCharge = round2(order.walletChargeAmount || 0);
  const newCharge = chargeResult.amount;
  const diff = round2(newCharge - previousCharge);

  const description = buildOrderChangeDescription({
    before: beforeSnapshot,
    after: afterSnapshot,
    fieldChanges,
    additionalDebit: diff > 0 && order.walletDeductedAt ? diff : 0,
  });

  const changeMeta = {
    externalOrderId: order.externalOrderId,
    awbNumber: shipping?.awbNumber || "",
    zone: afterZone,
    service: normalizedService,
    chargeableWeight: chargeResult.chargeableWeight,
    previousCharge,
    newCharge,
    adjustmentType: "order_update",
    fieldChanges,
    mismatchDetails: fieldChanges,
    beforeSnapshot,
    afterSnapshot,
    displayDescription: description,
  };

  if (order.walletDeductedAt && diff > 0) {
    const afford = await assertWalletCanAfford(order.companyID, diff);
    if (!afford.ok) {
      return { success: false, message: afford.message };
    }

    const debitResult = await debitOrderChargeAdjustment({
      companyID: order.companyID,
      orderId: order._id,
      amount: diff,
      description,
      createdBy,
      meta: changeMeta,
    });

    if (!debitResult.success) {
      return debitResult;
    }
  } else if (fieldChanges.length > 0) {
    await logOrderWalletFieldChange({
      companyID: order.companyID,
      orderId: order._id,
      description,
      createdBy,
      meta: changeMeta,
    });
  }

  order.weight = previewOrder.weight;
  order.actualWeight = previewOrder.actualWeight;
  order.volumetricWeight = previewOrder.volumetricWeight;
  order.chargeableWeight = previewOrder.chargeableWeight;
  order.length = previewOrder.length;
  order.breadth = previewOrder.breadth;
  order.height = previewOrder.height;
  order.odaCharge = previewOrder.odaCharge;
  order.walletChargeAmount = newCharge;

  if (shipping) {
    shipping.serviceType = normalizedService;
    shipping.totalWeight = previewOrder.chargeableWeight;
  }

  return {
    success: true,
    newCharge,
    previousCharge,
    additionalDebit: diff > 0 && order.walletDeductedAt ? diff : 0,
    service: normalizedService,
    zone: afterZone,
    chargeableWeight: chargeResult.chargeableWeight,
    description,
    fieldChanges,
  };
};

module.exports = {
  normalizeServiceType,
  applyOrderWalletFieldUpdate,
};
