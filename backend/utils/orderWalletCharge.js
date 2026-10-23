const PincodeServiceability = require("../models/upload/serviceability.model");
const {
  calculateFinalOrderRate,
  resolveZoneForOrder,
} = require("./calculateFinalOrderRate");
const { round2 } = require("./walletService");

const walletChargeFromBreakdown = (breakdown, odaCharge = 0) => {
  const subtotal = round2(breakdown?.subtotalBeforeFuel ?? 0);
  const oda = round2(odaCharge);
  return round2(subtotal + oda);
};

const calculateOrderWalletCharge = async (order, serviceType) => {
  const zoneInfo = await resolveZoneForOrder({
    zone: order.category,
    order,
    PincodeServiceability,
  });

  if (!zoneInfo.zone) {
    return {
      success: false,
      message: "Unable to resolve destination zone for wallet charge.",
    };
  }

  const rateResult = await calculateFinalOrderRate({
    companyID: order.companyID,
    service: serviceType,
    weight: order.chargeableWeight || order.weight,
    length: order.length,
    breadth: order.breadth,
    height: order.height,
    zone: zoneInfo.zone,
    paymentMethod: order.paymentMethod,
    invoiceValue: order.invoiceValue,
    deferFuelSurcharge: true,
  });

  if (!rateResult.success) {
    return rateResult;
  }

  const odaCharge = round2(order.odaCharge ?? 0);
  const amount = walletChargeFromBreakdown(rateResult.breakdown, odaCharge);

  return {
    success: true,
    amount,
    zone: zoneInfo.zone,
    breakdown: rateResult.breakdown,
    odaCharge,
    service: rateResult.service,
    chargeableWeight: rateResult.chargeableWeight,
  };
};

module.exports = {
  calculateOrderWalletCharge,
  walletChargeFromBreakdown,
};
