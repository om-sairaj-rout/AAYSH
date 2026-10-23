import { createRazorpayOrderAPI, verifyRazorpayPaymentAPI } from "../api/razorpayAPI";

export const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  });

/**
 * Standard Checkout: create order → modal → verify signature on success.
 * @param {object} options
 * @param {number} options.amountPaise - Amount in paise (min 100)
 * @param {string} [options.keyId] - Razorpay key; falls back to VITE_RAZORPAY_KEY_ID or server key_id
 * @param {string} [options.currency]
 * @param {string} [options.receipt]
 * @param {string} [options.name]
 * @param {string} [options.description]
 * @param {object} [options.prefill]
 * @param {function} [options.onVerified] - Called after server verifies payment
 * @param {function} [options.onDismiss]
 * @param {function} [options.onFailed]
 */
export const openRazorpayStandardCheckout = async ({
  amountPaise,
  keyId,
  currency = "INR",
  receipt,
  name = "AAYSH Express",
  description = "Payment",
  prefill = {},
  onVerified,
  onDismiss,
  onFailed,
}) => {
  const orderRes = await createRazorpayOrderAPI({
    amount: amountPaise,
    currency,
    receipt,
  });

  const order = orderRes.data || orderRes;
  const resolvedKey =
    keyId ||
    order.key_id ||
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    "";

  if (!resolvedKey || !order.order_id) {
    throw new Error("Invalid Razorpay order session from server");
  }

  const Razorpay = await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    const options = {
      key: resolvedKey,
      amount: order.amount,
      currency: order.currency || currency,
      name,
      description,
      order_id: order.order_id,
      prefill,
      theme: { color: "#1B2B4B" },
      handler: async (response) => {
        try {
          const verifyRes = await verifyRazorpayPaymentAPI({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (onVerified) {
            await onVerified(verifyRes, response);
          }
          resolve({ verifyRes, response });
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) onDismiss();
          reject(new Error("Payment cancelled"));
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", (response) => {
      if (onFailed) onFailed(response);
      reject(new Error(response?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
};
