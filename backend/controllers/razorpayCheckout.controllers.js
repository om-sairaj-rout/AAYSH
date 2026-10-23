const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../utils/razorpayCheckoutService");

const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body || {};

    const result = await createRazorpayOrder({
      amount,
      currency,
      receipt,
      notes,
    });

    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      order_id: result.order_id,
      amount: result.amount,
      currency: result.currency,
      key_id: result.key_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create order.",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    const result = verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      order_id: result.order_id,
      payment_id: result.payment_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed.",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
