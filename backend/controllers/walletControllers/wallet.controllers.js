const Company = require("../../models/company.model");
const { resolveRateCompanyID } = require("../../utils/companyScope");
const {
  getWalletSummary,
  adminAdjustWallet,
  listTransactions,
  listRecharges,
  normalizeCompanyID,
} = require("../../utils/walletService");
const {
  createPendingRazorpayRecharge,
  finalizeWalletRechargeFromRazorpay,
  markRechargeCancelled,
} = require("../../utils/walletRazorpayService");
const { isRazorpayConfigured, getRazorpayKeyId } = require("../../utils/razorpayClient");

const resolveTargetCompany = (req, requestedCompanyID) => {
  const scope = resolveRateCompanyID(req, requestedCompanyID);
  if (!scope.ok) {
    return scope;
  }
  return { ok: true, companyID: scope.companyID };
};

const getWalletOverview = async (req, res) => {
  try {
    const scope = resolveTargetCompany(req, req.query.companyID);
    if (!scope.ok) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }

    const company = await Company.findOne({ companyID: scope.companyID })
      .select("companyID companyName walletEnabled")
      .lean();

    const summary = await getWalletSummary(scope.companyID);

    return res.status(200).json({
      success: true,
      data: {
        ...summary,
        companyName: company?.companyName || "",
        walletEnabled: Boolean(company?.walletEnabled),
        razorpayConfigured: isRazorpayConfigured(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getWalletTransactions = async (req, res) => {
  try {
    const scope = resolveTargetCompany(req, req.query.companyID);
    if (!scope.ok) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }

    const result = await listTransactions({
      companyID: scope.companyID,
      page: req.query.page,
      limit: req.query.limit,
      type: req.query.type,
      category: req.query.category,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      awb: req.query.awb,
      search: req.query.search,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getWalletRecharges = async (req, res) => {
  try {
    const scope = resolveTargetCompany(req, req.query.companyID);
    if (!scope.ok) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }

    const result = await listRecharges({
      companyID: scope.companyID,
      page: req.query.page,
      limit: req.query.limit,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      search: req.query.search,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const initiateWalletRecharge = async (req, res) => {
  try {
    const scope = resolveTargetCompany(req, req.body.companyID);
    if (!scope.ok) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }

    const { amount, notes } = req.body;
    const result = await createPendingRazorpayRecharge({
      companyID: scope.companyID,
      amount,
      initiatedBy: req.user.id,
      notes,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(201).json({
      success: true,
      message: "Razorpay order created. Complete payment to credit your wallet.",
      data: {
        rechargeId: result.recharge._id,
        transactionCode: result.recharge.transactionCode,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.recharge.amount,
        amountPaise: result.amountPaise,
        currency: result.currency,
        keyId: result.keyId,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminWalletAdjust = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can adjust company wallets.",
      });
    }

    const {
      companyID,
      amount,
      direction,
      note,
      reason,
      reasonKey,
      customReason,
      shipmentDetails,
    } = req.body;
    const normalized = normalizeCompanyID(companyID);
    if (!normalized) {
      return res.status(400).json({ success: false, message: "companyID is required." });
    }

    const company = await Company.findOne({ companyID: normalized }).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const result = await adminAdjustWallet({
      companyID: normalized,
      amount,
      direction,
      note: reason ?? note,
      reasonKey,
      customReason,
      shipmentDetails,
      createdBy: req.user.id,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const summary = await getWalletSummary(normalized);

    return res.status(200).json({
      success: true,
      message: "Wallet updated successfully.",
      data: {
        transaction: result.transaction,
        wallet: summary,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCompanyWalletSetting = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can change wallet settings.",
      });
    }

    const companyID = normalizeCompanyID(req.params.companyID);
    const { walletEnabled } = req.body;

    const company = await Company.findOneAndUpdate(
      { companyID },
      { walletEnabled: Boolean(walletEnabled) },
      { new: true }
    ).lean();

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        companyID: company.companyID,
        walletEnabled: Boolean(company.walletEnabled),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const verifyWalletRecharge = async (req, res) => {
  try {
    const scope = resolveTargetCompany(req, req.body.companyID);
    if (!scope.ok) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }

    const {
      rechargeId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!rechargeId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification fields are required.",
      });
    }

    const WalletRecharge = require("../../models/walletRecharge.model");
    const owned = await WalletRecharge.findOne({
      _id: rechargeId,
      companyID: scope.companyID,
    }).lean();
    if (!owned) {
      return res.status(404).json({ success: false, message: "Recharge not found." });
    }

    const result = await finalizeWalletRechargeFromRazorpay({
      rechargeId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      createdBy: req.user.id,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const summary = await getWalletSummary(scope.companyID);

    return res.status(200).json({
      success: true,
      message: result.duplicate
        ? "Wallet already credited for this payment."
        : "Wallet recharged successfully.",
      data: {
        recharge: result.recharge,
        transaction: result.transaction,
        wallet: summary,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const cancelWalletRecharge = async (req, res) => {
  try {
    const scope = resolveTargetCompany(req, req.body.companyID);
    if (!scope.ok) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }

    const { rechargeId } = req.body;
    if (!rechargeId) {
      return res.status(400).json({ success: false, message: "rechargeId is required." });
    }

    const WalletRecharge = require("../../models/walletRecharge.model");
    const recharge = await WalletRecharge.findOne({
      _id: rechargeId,
      companyID: scope.companyID,
    });

    if (!recharge) {
      return res.status(404).json({ success: false, message: "Recharge not found." });
    }

    if (recharge.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel recharge with status ${recharge.status}.`,
      });
    }

    await markRechargeCancelled(rechargeId);

    return res.status(200).json({
      success: true,
      message: "Recharge cancelled.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWalletOverview,
  getWalletTransactions,
  getWalletRecharges,
  initiateWalletRecharge,
  verifyWalletRecharge,
  cancelWalletRecharge,
  adminWalletAdjust,
  updateCompanyWalletSetting,
};
