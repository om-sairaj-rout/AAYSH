const mongoose = require("mongoose");
const Order = require("../models/upload/order.model");
const WalletTransaction = require("../models/walletTransaction.model");
const { applyWalletMutation, round2, normalizeCompanyID } = require("./walletService");

const REVERSAL_REFERENCE_TYPE = "delhivery_manifest_reversal";

const recordDelhiveryWalletInconsistency = async ({
  manifestId,
  orderId,
  reason,
  walletDebited = false,
}) => {
  if (!manifestId) return;
  const DelhiveryShipmentManifest = require("../models/delhiveryShipmentManifest.model");
  await DelhiveryShipmentManifest.updateOne(
    { _id: manifestId },
    {
      $set: {
        walletReconciliationRequired: true,
        walletReconciliationReason: String(reason || "").slice(0, 500),
        walletDebitedBeforeManifest: Boolean(walletDebited),
      },
    }
  );
};

/**
 * Idempotent credit when Delhivery manifestation definitely failed after a wallet debit.
 * Does not run on timeout/uncertain (shipment may exist).
 */
const reverseDelhiveryShipmentDebitIfNeeded = async ({
  orderId,
  companyID,
  externalOrderId,
  createdBy = null,
}) => {
  const orderObjectId = mongoose.Types.ObjectId.isValid(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : null;
  if (!orderObjectId) {
    return { success: false, message: "Invalid orderId" };
  }

  const existingReversal = await WalletTransaction.findOne({
    referenceType: REVERSAL_REFERENCE_TYPE,
    referenceId: orderObjectId,
  }).lean();

  if (existingReversal) {
    return {
      success: true,
      duplicate: true,
      transaction: existingReversal,
    };
  }

  const debitTx = await WalletTransaction.findOne({
    referenceType: "order",
    referenceId: orderObjectId,
    type: "debit",
  }).lean();

  if (!debitTx) {
    return { success: true, skipped: true, reason: "NO_DEBIT_TO_REVERSE" };
  }

  const amount = round2(debitTx.amount);
  if (amount <= 0) {
    return { success: true, skipped: true, reason: "ZERO_DEBIT" };
  }

  const debitCompany = normalizeCompanyID(debitTx.companyID || "");
  const requestCompany = normalizeCompanyID(companyID || "");
  if (debitCompany !== requestCompany) {
    return {
      success: false,
      message: "Wallet reversal company does not match original debit transaction.",
    };
  }

  const creditResult = await applyWalletMutation({
    companyID: debitCompany,
    type: "credit",
    amount,
    category: "refund_adjustment",
    description: `Delhivery manifestation failed — reverse shipment charge for order ${externalOrderId || orderId}`,
    referenceType: REVERSAL_REFERENCE_TYPE,
    referenceId: orderObjectId,
    createdBy,
    meta: {
      displayDescription: "Delhivery manifest failure reversal",
      relatedDebitTransactionId: String(debitTx._id),
    },
  });

  if (!creditResult.success) {
    return creditResult;
  }

  await Order.updateOne(
    { _id: orderObjectId, walletDeductedAt: { $ne: null } },
    {
      $unset: {
        walletDeductedAt: "",
        walletChargeAmount: "",
        walletTransactionId: "",
      },
    }
  );

  return {
    success: true,
    transaction: creditResult.transaction,
    reversedAmount: amount,
  };
};

module.exports = {
  REVERSAL_REFERENCE_TYPE,
  recordDelhiveryWalletInconsistency,
  reverseDelhiveryShipmentDebitIfNeeded,
};
