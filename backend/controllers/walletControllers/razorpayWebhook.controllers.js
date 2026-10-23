const { processRazorpayWebhook } = require("../../utils/walletRazorpayService");

const razorpayWalletWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ success: false, message: "Invalid webhook body." });
    }

    const result = await processRazorpayWebhook(rawBody, signature);
    return res.status(result.status || 200).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = razorpayWalletWebhook;
