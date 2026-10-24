const crypto = require("crypto");
const mongoose = require("mongoose");
const WalletRecharge = require("../models/walletRecharge.model");
const WalletTransaction = require("../models/walletTransaction.model");
const {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  razorpayConfigHint,
} = require("./razorpayClient");
const { verifyPaymentSignature } = require("./razorpayCheckoutService");
const {
  round2,
  normalizeCompanyID,
  applyWalletMutation,
} = require("./walletService");
const { buildMrcCode } = require("./walletTransactionCodes");
const { validateRechargeAmount } = require("./walletRechargeValidation");

const RECHARGE_CURRENCY = "INR";

const amountToPaise = (amountInr) => Math.round(round2(amountInr) * 100);

const verifyCheckoutSignature = verifyPaymentSignature;

const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signatureHeader;
};

const createPendingRazorpayRecharge = async ({
  companyID,
  amount,
  initiatedBy,
  notes = "",
}) => {
  if (!isRazorpayConfigured()) {
    return {
      success: false,
      message: `Wallet recharge is not configured. ${razorpayConfigHint()}`,
    };
  }

  const normalized = normalizeCompanyID(companyID);
  const rechargeValidation = validateRechargeAmount(amount);
  if (!rechargeValidation.ok) {
    return { success: false, message: rechargeValidation.message };
  }
  const value = rechargeValidation.amount;

  const paise = amountToPaise(value);

  const rechargeId = new mongoose.Types.ObjectId();
  const transactionCode = buildMrcCode(rechargeId);

  const recharge = await WalletRecharge.create({
    _id: rechargeId,
    companyID: normalized,
    amount: value,
    currency: RECHARGE_CURRENCY,
    status: "pending",
    paymentProvider: "razorpay",
    initiatedBy,
    notes,
    transactionCode,
  });

  const razorpay = getRazorpayClient();
  let order;
  try {
    order = await razorpay.orders.create({
      amount: paise,
      currency: RECHARGE_CURRENCY,
      receipt: String(recharge._id),
      notes: {
        companyID: normalized,
        rechargeId: String(recharge._id),
      },
    });
  } catch (error) {
    await WalletRecharge.findByIdAndUpdate(recharge._id, { status: "failed" });
    const statusCode = error.statusCode || error.error?.statusCode;
    const description =
      error.error?.description || error.description || error.message;
    if (statusCode === 401) {
      return {
        success: false,
        message:
          "Razorpay rejected the API keys (401). Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env match the same Test/Live mode.",
      };
    }
    return {
      success: false,
      message: description || "Failed to create Razorpay order.",
    };
  }

  await WalletRecharge.findByIdAndUpdate(recharge._id, {
    providerOrderId: order.id,
  });

  return {
    success: true,
    recharge,
    razorpayOrderId: order.id,
    amountPaise: order.amount,
    currency: order.currency,
    keyId: getRazorpayKeyId(),
  };
};

const fetchRazorpayPayment = async (paymentId) => {
  const razorpay = getRazorpayClient();
  if (!razorpay) return null;
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch {
    return null;
  }
};

const validatePaymentAgainstRecharge = (payment, recharge) => {
  if (!payment || !recharge) {
    return { ok: false, message: "Payment verification failed." };
  }

  if (payment.order_id !== recharge.providerOrderId) {
    return { ok: false, message: "Payment does not match this recharge order." };
  }

  const paymentPaise = Number(payment.amount);
  const expectedPaise = amountToPaise(recharge.amount);
  if (paymentPaise !== expectedPaise) {
    return { ok: false, message: "Payment amount does not match recharge amount." };
  }

  const paymentCurrency = String(payment.currency || "").toUpperCase();
  const rechargeCurrency = String(recharge.currency || RECHARGE_CURRENCY).toUpperCase();
  if (paymentCurrency !== rechargeCurrency) {
    return { ok: false, message: "Payment currency does not match." };
  }

  const notesCompany = payment.notes?.companyID || payment.notes?.companyId;
  if (notesCompany && normalizeCompanyID(notesCompany) !== recharge.companyID) {
    return { ok: false, message: "Payment company mismatch." };
  }

  if (String(payment.status || "").toLowerCase() !== "captured") {
    return {
      ok: false,
      message: `Payment is not successful (status: ${payment.status}).`,
    };
  }

  return { ok: true, payment };
};

const creditWalletForRecharge = async (recharge, payment, createdBy = null) => {
  const rechargeAmountCheck = validateRechargeAmount(recharge.amount);
  if (!rechargeAmountCheck.ok) {
    return { success: false, message: rechargeAmountCheck.message };
  }

  const existingTx = await WalletTransaction.findOne({
    rechargeId: recharge._id,
  }).lean();
  if (existingTx) {
    return {
      success: true,
      duplicate: true,
      transaction: existingTx,
      recharge,
    };
  }

  if (recharge.providerPaymentId) {
    const dup = await WalletRecharge.findOne({
      providerPaymentId: recharge.providerPaymentId,
      status: "completed",
      _id: { $ne: recharge._id },
    }).lean();
    if (dup) {
      return {
        success: false,
        message: "This payment was already used for another recharge.",
      };
    }
  }

  const mutation = await applyWalletMutation({
    companyID: recharge.companyID,
    type: "credit",
    amount: recharge.amount,
    category: "recharge",
    description: recharge.notes
      ? `Wallet recharge — ${recharge.notes}`
      : "Wallet recharge",
    rechargeId: recharge._id,
    createdBy,
    meta: {
      displayDescription: "Wallet recharge",
      razorpayOrderId: recharge.providerOrderId,
      razorpayPaymentId: payment.id,
    },
  });

  if (!mutation.success) {
    return mutation;
  }

  const updated = await WalletRecharge.findOneAndUpdate(
    { _id: recharge._id, status: "pending" },
    {
      $set: {
        status: "completed",
        providerPaymentId: payment.id,
        completedAt: new Date(),
        walletTransactionId: mutation.transaction._id,
      },
    },
    { new: true }
  );

  if (!updated) {
    const latest = await WalletRecharge.findById(recharge._id).lean();
    if (latest?.status === "completed") {
      return {
        success: true,
        duplicate: true,
        recharge: latest,
        transaction: mutation.transaction,
      };
    }
    return {
      success: false,
      message: "Could not finalize recharge status.",
    };
  }

  return {
    success: true,
    recharge: updated,
    transaction: mutation.transaction,
    wallet: mutation.wallet,
  };
};

const finalizeWalletRechargeFromRazorpay = async ({
  rechargeId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  createdBy = null,
  skipSignatureCheck = false,
}) => {
  const recharge = await WalletRecharge.findById(rechargeId);
  if (!recharge) {
    return { success: false, message: "Recharge not found." };
  }

  if (recharge.status === "completed") {
    return {
      success: true,
      duplicate: true,
      message: "Recharge already completed.",
      recharge,
    };
  }

  if (recharge.status === "cancelled") {
    return { success: false, message: "This recharge was cancelled." };
  }

  if (
    razorpayOrderId &&
    recharge.providerOrderId &&
    razorpayOrderId !== recharge.providerOrderId
  ) {
    return { success: false, message: "Order ID does not match this recharge." };
  }

  if (!skipSignatureCheck) {
    const valid = verifyCheckoutSignature({
      orderId: razorpayOrderId || recharge.providerOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!valid) {
      return { success: false, message: "Invalid payment signature." };
    }
  }

  const payment = await fetchRazorpayPayment(razorpayPaymentId);
  const validation = validatePaymentAgainstRecharge(payment, recharge);
  if (!validation.ok) {
    return { success: false, message: validation.message };
  }

  const locked = await WalletRecharge.findOneAndUpdate(
    { _id: recharge._id, status: "pending" },
    { $set: { providerPaymentId: razorpayPaymentId } },
    { new: true }
  );

  if (!locked && recharge.status !== "pending") {
    const latest = await WalletRecharge.findById(recharge._id).lean();
    if (latest?.status === "completed") {
      return { success: true, duplicate: true, recharge: latest };
    }
  }

  return creditWalletForRecharge(
    locked || recharge,
    validation.payment,
    createdBy
  );
};

const markRechargeFailed = async (rechargeId, reason = "") => {
  await WalletRecharge.findOneAndUpdate(
    { _id: rechargeId, status: "pending" },
    { $set: { status: "failed", notes: reason ? reason : undefined } }
  );
};

const markRechargeCancelled = async (rechargeId) => {
  await WalletRecharge.findOneAndUpdate(
    { _id: rechargeId, status: "pending" },
    { $set: { status: "cancelled" } }
  );
};

const processRazorpayWebhook = async (rawBody, signatureHeader) => {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    return { success: false, status: 400, message: "Invalid webhook signature." };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { success: false, status: 400, message: "Invalid webhook payload." };
  }

  const event = payload.event;
  const paymentEntity =
    payload.payload?.payment?.entity || payload.payload?.payment;
  if (!paymentEntity?.id) {
    return { success: true, status: 200, message: "Ignored event." };
  }

  const orderId = paymentEntity.order_id;
  const recharge = await WalletRecharge.findOne({ providerOrderId: orderId });
  if (!recharge) {
    return { success: true, status: 200, message: "Recharge not found for order." };
  }

  if (event === "payment.failed") {
    await markRechargeFailed(recharge._id, "Payment failed (webhook)");
    return { success: true, status: 200, message: "Marked failed." };
  }

  if (event === "payment.captured" || event === "order.paid") {
    const result = await finalizeWalletRechargeFromRazorpay({
      rechargeId: recharge._id,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentEntity.id,
      skipSignatureCheck: true,
      createdBy: recharge.initiatedBy,
    });
    return {
      success: result.success,
      status: result.success ? 200 : 400,
      message: result.message || "Processed.",
      data: result,
    };
  }

  return { success: true, status: 200, message: "Event ignored." };
};

module.exports = {
  createPendingRazorpayRecharge,
  finalizeWalletRechargeFromRazorpay,
  markRechargeCancelled,
  processRazorpayWebhook,
  verifyCheckoutSignature,
};
