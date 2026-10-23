const Razorpay = require("razorpay");

let client = null;

const getRazorpayKeyId = () => String(process.env.RAZORPAY_KEY_ID || "").trim();

const getRazorpayKeySecret = () =>
  String(process.env.RAZORPAY_KEY_SECRET || "").trim();

const getRazorpayClient = () => {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    return null;
  }
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
};

const isRazorpayConfigured = () =>
  Boolean(getRazorpayKeyId() && getRazorpayKeySecret());

const razorpayConfigHint = () =>
  "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env (Razorpay Dashboard → API Keys, Test mode), then restart the server.";

module.exports = {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  razorpayConfigHint,
};
