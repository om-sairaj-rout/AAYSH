const crypto = require("crypto");
const {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
} = require("./razorpayClient");

const DEFAULT_CURRENCY = "INR";

/**
 * Standard Checkout signature: HMAC-SHA256(order_id|payment_id, KEY_SECRET)
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) {
    return false;
  }
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === signature;
};

const createRazorpayOrder = async ({
  amount,
  currency = DEFAULT_CURRENCY,
  receipt,
  notes = {},
}) => {
  if (!isRazorpayConfigured()) {
    return {
      success: false,
      statusCode: 503,
      message: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    };
  }

  const amountPaise = Math.round(Number(amount));
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return {
      success: false,
      statusCode: 400,
      message: "Amount must be at least 100 paise (₹1).",
    };
  }

  const razorpay = getRazorpayClient();
  const receiptId =
    receipt && String(receipt).trim()
      ? String(receipt).trim().slice(0, 40)
      : `rcpt_${Date.now()}`;

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: String(currency || DEFAULT_CURRENCY).toUpperCase(),
      receipt: receiptId,
      notes: notes && typeof notes === "object" ? notes : {},
    });

    return {
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getRazorpayKeyId(),
    };
  } catch (error) {
    const statusCode = error.statusCode === 401 ? 401 : 500;
    const message =
      error.error?.description ||
      error.error?.reason ||
      error.message ||
      "Failed to create Razorpay order.";
    return { success: false, statusCode, message };
  }
};

const verifyRazorpayPayment = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return {
      success: false,
      statusCode: 400,
      message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
    };
  }

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!valid) {
    return {
      success: false,
      statusCode: 400,
      message: "Payment signature verification failed.",
    };
  }

  return {
    success: true,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
  };
};

module.exports = {
  verifyPaymentSignature,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
