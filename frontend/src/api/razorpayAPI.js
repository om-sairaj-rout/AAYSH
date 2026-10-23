const BASE = import.meta.env.VITE_API_URL;

const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

/** Amount in paise (minimum 100). */
export const createRazorpayOrderAPI = async ({ amount, currency = "INR", receipt, notes }) => {
  const res = await fetch(`${BASE}/api/create-order`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency, receipt, notes }),
  });
  return parseResponse(res);
};

export const verifyRazorpayPaymentAPI = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const res = await fetch(`${BASE}/api/verify-payment`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  });
  return parseResponse(res);
};
