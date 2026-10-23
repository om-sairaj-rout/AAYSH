const mongoose = require("mongoose");
const { buildMtxCode, buildMrcCode } = require("./walletTransactionCodes");
const Wallet = require("../models/wallet.model");
const WalletTransaction = require("../models/walletTransaction.model");
const WalletRecharge = require("../models/walletRecharge.model");
const Company = require("../models/company.model");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");

const WALLET_MIN_BALANCE = 100;

const ADMIN_ADJUSTMENT_REASONS = {
  manual_credit: "Manual wallet credit",
  payment_adjustment: "Payment adjustment",
  order_charge_correction: "Order charge correction",
  weight_correction: "Weight correction",
  oda_correction: "ODA charge correction",
  refund_adjustment: "Refund adjustment",
  penalty_charge: "Penalty or additional charge",
  other: "Other",
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const normalizeCompanyID = (companyID) =>
  String(companyID || "").trim().toUpperCase();

const getOrCreateWallet = async (companyID) => {
  const normalized = normalizeCompanyID(companyID);
  if (!normalized) {
    throw new Error("Company ID is required.");
  }

  let wallet = await Wallet.findOne({ companyID: normalized });
  if (!wallet) {
    wallet = await Wallet.create({
      companyID: normalized,
      balance: 0,
      totalCredit: 0,
      totalDebit: 0,
    });
  }
  return wallet;
};

const getWalletSummary = async (companyID) => {
  const wallet = await getOrCreateWallet(companyID);
  return {
    companyID: wallet.companyID,
    balance: round2(wallet.balance),
    totalCredit: round2(wallet.totalCredit),
    totalDebit: round2(wallet.totalDebit),
    updatedAt: wallet.updatedAt,
  };
};

const isWalletEnabledForCompany = async (companyID) => {
  const normalized = normalizeCompanyID(companyID);
  if (!normalized) return false;
  const company = await Company.findOne({ companyID: normalized })
    .select("walletEnabled")
    .lean();
  return Boolean(company?.walletEnabled);
};

const assertWalletMinBalance = async (companyID) => {
  const normalized = normalizeCompanyID(companyID);
  const wallet = await getOrCreateWallet(normalized);
  const balance = round2(wallet.balance);
  if (balance < WALLET_MIN_BALANCE) {
    return {
      ok: false,
      message: `Wallet balance must be at least ₹${WALLET_MIN_BALANCE}. Current balance: ₹${balance.toFixed(2)}. Please recharge your wallet.`,
      balance,
    };
  }
  return { ok: true, balance };
};

const assertWalletCanAfford = async (companyID, amount) => {
  const normalized = normalizeCompanyID(companyID);
  const value = round2(amount);
  const wallet = await getOrCreateWallet(normalized);
  const balance = round2(wallet.balance);
  if (balance < value) {
    return {
      ok: false,
      message: `Insufficient wallet balance. Required: ₹${value.toFixed(2)}, available: ₹${balance.toFixed(2)}.`,
      balance,
      required: value,
    };
  }
  return { ok: true, balance, required: value };
};

const ensureWalletReadyForShipment = async (companyID, chargeAmount) => {
  const minCheck = await assertWalletMinBalance(companyID);
  if (!minCheck.ok) return minCheck;
  const affordCheck = await assertWalletCanAfford(companyID, chargeAmount);
  if (!affordCheck.ok) return affordCheck;
  return { ok: true };
};

const applyWalletMutation = async ({
  companyID,
  type,
  amount,
  category,
  description = "",
  referenceType = "",
  referenceId = null,
  rechargeId = null,
  createdBy = null,
  meta = {},
}) => {
  const normalized = normalizeCompanyID(companyID);
  const value = round2(amount);
  if (value <= 0) {
    return { success: false, message: "Amount must be greater than zero." };
  }

  if (type === "debit") {
    const wallet = await Wallet.findOneAndUpdate(
      { companyID: normalized, balance: { $gte: value } },
      {
        $inc: { balance: -value, totalDebit: value },
      },
      { new: true }
    );
    if (!wallet) {
      return {
        success: false,
        message: "Insufficient wallet balance for this operation.",
      };
    }

    const txId = new mongoose.Types.ObjectId();
    const transactionCode = buildMtxCode(txId);
    const transaction = await WalletTransaction.create({
      _id: txId,
      companyID: normalized,
      type: "debit",
      amount: value,
      balanceAfter: round2(wallet.balance),
      category,
      description,
      referenceType,
      referenceId,
      rechargeId,
      createdBy,
      meta: { ...meta, transactionCode },
    });

    return { success: true, wallet, transaction };
  }

  const wallet = await Wallet.findOneAndUpdate(
    { companyID: normalized },
    {
      $inc: { balance: value, totalCredit: value },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const txId = new mongoose.Types.ObjectId();
  const transactionCode = buildMtxCode(txId);
  const transaction = await WalletTransaction.create({
    _id: txId,
    companyID: normalized,
    type: "credit",
    amount: value,
    balanceAfter: round2(wallet.balance),
    category,
    description,
    referenceType,
    referenceId,
    rechargeId,
    createdBy,
    meta: { ...meta, transactionCode },
  });

  return { success: true, wallet, transaction };
};

const debitForOrder = async ({
  companyID,
  orderId,
  amount,
  description,
  createdBy,
  meta = {},
}) => {
  const existing = await WalletTransaction.findOne({
    referenceType: "order",
    referenceId: orderId,
  }).lean();
  if (existing) {
    return {
      success: true,
      duplicate: true,
      transaction: existing,
      message: "Order wallet charge already recorded.",
    };
  }

  return applyWalletMutation({
    companyID,
    type: "debit",
    amount,
    category: "order_charge",
    description: description || "Shipment charge",
    referenceType: "order",
    referenceId: orderId,
    createdBy,
    meta: {
      ...meta,
      displayDescription: meta.displayDescription || "Shipment Manifested",
    },
  });
};

const debitOrderChargeAdjustment = async ({
  companyID,
  orderId,
  amount,
  description,
  createdBy,
  meta = {},
}) =>
  applyWalletMutation({
    companyID,
    type: "debit",
    amount,
    category: "order_charge",
    description,
    referenceType: "order_adjustment",
    referenceId: new mongoose.Types.ObjectId(),
    createdBy,
    meta: {
      ...meta,
      orderId: String(orderId),
      displayDescription: meta.displayDescription || "Shipment charge adjustment",
    },
  });

const refundOrderCancellation = async ({ order, createdBy = null }) => {
  if (!order?.walletDeductedAt) {
    return { success: true, skipped: true, reason: "No wallet charge on order." };
  }

  const original = round2(order.walletChargeAmount || 0);
  if (original <= 0) {
    return { success: true, skipped: true, reason: "Zero wallet charge." };
  }

  const existing = await WalletTransaction.findOne({
    referenceType: "order_cancel_refund",
    referenceId: order._id,
  }).lean();
  if (existing) {
    return {
      success: true,
      duplicate: true,
      transaction: existing,
      message: "Cancellation refund already processed.",
    };
  }

  const refundAmount = round2(original * 0.5);
  if (refundAmount <= 0) {
    return { success: true, skipped: true, reason: "Refund amount is zero." };
  }

  return applyWalletMutation({
    companyID: order.companyID,
    type: "credit",
    amount: refundAmount,
    category: "order_refund",
    description: `50% refund for cancelled AWB — order ${order.externalOrderId}`,
    referenceType: "order_cancel_refund",
    referenceId: order._id,
    createdBy,
    meta: {
      externalOrderId: order.externalOrderId,
      originalCharge: original,
      refundPercent: 50,
      displayDescription: "AWB cancellation refund (50%)",
    },
  });
};

const adminAdjustWallet = async ({
  companyID,
  amount,
  direction,
  note,
  reasonKey,
  customReason,
  shipmentDetails = {},
  createdBy,
}) => {
  const value = round2(amount);
  if (value <= 0) {
    return { success: false, message: "Amount must be greater than zero." };
  }

  const key = String(reasonKey || "").trim();
  let reasonLabel = ADMIN_ADJUSTMENT_REASONS[key] || String(note || "").trim();

  if (key === "other") {
    const custom = String(customReason || note || "").trim();
    if (!custom) {
      return {
        success: false,
        message: "A custom reason is required when Other is selected.",
      };
    }
    reasonLabel = custom;
  }

  if (!reasonLabel) {
    return { success: false, message: "A reason is required for wallet adjustments." };
  }

  const optionalDetails = {
    externalOrderId: String(shipmentDetails.externalOrderId || "").trim(),
    awbNumber: String(shipmentDetails.awbNumber || "").trim(),
    weight: shipmentDetails.weight !== undefined && shipmentDetails.weight !== ""
      ? round2(shipmentDetails.weight)
      : null,
    zone: String(shipmentDetails.zone || "").trim(),
    serviceMode: String(shipmentDetails.serviceMode || "").trim(),
    chargeableWeight:
      shipmentDetails.chargeableWeight !== undefined &&
      shipmentDetails.chargeableWeight !== ""
        ? round2(shipmentDetails.chargeableWeight)
        : null,
    odaCharge:
      shipmentDetails.odaCharge !== undefined && shipmentDetails.odaCharge !== ""
        ? round2(shipmentDetails.odaCharge)
        : null,
  };

  const isCredit = direction === "credit";
  return applyWalletMutation({
    companyID,
    type: isCredit ? "credit" : "debit",
    amount: value,
    category: isCredit ? "admin_credit" : "admin_debit",
    description: reasonLabel,
    createdBy,
    meta: {
      adminReason: reasonLabel,
      adminReasonKey: key || "legacy",
      adminCustomReason: key === "other" ? reasonLabel : "",
      displayDescription: reasonLabel,
      ...optionalDetails,
      shipmentDetails: optionalDetails,
    },
  });
};

const logOrderWalletFieldChange = async ({
  companyID,
  orderId,
  description,
  meta = {},
  createdBy = null,
}) => {
  const normalized = normalizeCompanyID(companyID);
  const wallet = await getOrCreateWallet(normalized);
  const txId = new mongoose.Types.ObjectId();
  const transactionCode = buildMtxCode(txId);

  const transaction = await WalletTransaction.create({
    _id: txId,
    companyID: normalized,
    type: "debit",
    amount: 0,
    balanceAfter: round2(wallet.balance),
    category: "adjustment",
    description,
    referenceType: "order_field_change",
    referenceId: new mongoose.Types.ObjectId(),
    createdBy,
    meta: {
      ...meta,
      orderId: String(orderId),
      transactionCode,
      noBalanceChange: true,
      displayDescription: description,
    },
  });

  return { success: true, transaction };
};

const buildTransactionListFilter = ({
  companyID,
  type,
  category,
  fromDate,
  toDate,
  awb,
  search,
}) => {
  const normalized = normalizeCompanyID(companyID);
  const filter = { companyID: normalized };

  if (type === "credit" || type === "debit") {
    filter.type = type;
  }
  if (category && category !== "recharge") {
    filter.category = category;
  } else {
    filter.category = { $ne: "recharge" };
  }
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  const searchTerm = String(search || awb || "").trim();
  if (searchTerm) {
    const escaped = escapeRegex(searchTerm);
    const orClauses = [
      { "meta.awbNumber": { $regex: escaped, $options: "i" } },
      { "meta.externalOrderId": { $regex: escaped, $options: "i" } },
      { "meta.transactionCode": { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ];
    if (mongoose.Types.ObjectId.isValid(searchTerm)) {
      orClauses.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
    }
    filter.$or = orClauses;
  }

  return filter;
};

const enrichTransactionRows = async (rows, companyName = "") => {
  const orderIds = [
    ...new Set(
      rows
        .map((row) => {
          if (row.referenceType === "order" || row.referenceType === "order_cancel_refund") {
            return row.referenceId;
          }
          if (
            (row.referenceType === "order_adjustment" ||
              row.referenceType === "order_field_change") &&
            row.meta?.orderId
          ) {
            return row.meta.orderId;
          }
          if (row.meta?.orderId) return row.meta.orderId;
          return null;
        })
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  const orders = orderIds.length
    ? await Order.find({ _id: { $in: orderIds } })
        .select(
          "externalOrderId chargeableWeight weight category companyID odaCharge"
        )
        .lean()
    : [];
  const orderMap = new Map(orders.map((o) => [String(o._id), o]));

  const shippings = orderIds.length
    ? await Shipping.find({ orderId: { $in: orderIds } })
        .select("orderId awbNumber serviceType")
        .lean()
    : [];
  const shippingMap = new Map(shippings.map((s) => [String(s.orderId), s]));

  return rows.map((row) => {
    const orderId =
      row.referenceType === "order" ||
      row.referenceType === "order_cancel_refund" ||
      row.referenceType === "order_adjustment"
        ? String(row.referenceId || "")
        : String(row.meta?.orderId || "");
    const order = orderMap.get(orderId);
    const shipping = shippingMap.get(orderId);
    const weightGm = Math.round(
      Number(order?.chargeableWeight || order?.weight || row.meta?.chargeableWeight || 0) * 1000
    );
    const zone = row.meta?.zone || order?.category || "—";
    const displayDescription =
      row.meta?.displayDescription ||
      row.meta?.adminReason ||
      row.description ||
      row.category;

    return {
      ...row,
      transactionCode:
        row.meta?.transactionCode || buildMtxCode(row._id),
      fieldChanges: row.meta?.fieldChanges || [],
      mismatchDetails: row.meta?.mismatchDetails || row.meta?.fieldChanges || [],
      beforeSnapshot: row.meta?.beforeSnapshot || null,
      afterSnapshot: row.meta?.afterSnapshot || null,
      companyName: companyName || row.meta?.companyName || "",
      externalOrderId:
        order?.externalOrderId ||
        row.meta?.externalOrderId ||
        row.meta?.shipmentDetails?.externalOrderId ||
        "",
      awbNumber:
        shipping?.awbNumber ||
        row.meta?.awbNumber ||
        row.meta?.shipmentDetails?.awbNumber ||
        "",
      weightLabel: weightGm > 0 ? `${weightGm} gm` : "—",
      zoneLabel: zone,
      displayDescription,
    };
  });
};

const listTransactions = async ({
  companyID,
  page = 1,
  limit = 20,
  type,
  category,
  fromDate,
  toDate,
  awb,
  search,
}) => {
  const normalized = normalizeCompanyID(companyID);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = buildTransactionListFilter({
    companyID: normalized,
    type,
    category,
    fromDate,
    toDate,
    awb,
    search,
  });

  const company = await Company.findOne({ companyID: normalized })
    .select("companyName")
    .lean();

  const [rows, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  const enriched = await enrichTransactionRows(rows, company?.companyName || "");

  return {
    rows: enriched,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const listRecharges = async ({
  companyID,
  page = 1,
  limit = 20,
  fromDate,
  toDate,
  search,
}) => {
  const normalized = normalizeCompanyID(companyID);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = { companyID: normalized };
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  const searchTerm = String(search || "").trim();
  if (searchTerm) {
    const escaped = escapeRegex(searchTerm);
    const orClauses = [
      { transactionCode: { $regex: escaped, $options: "i" } },
      { providerPaymentId: { $regex: escaped, $options: "i" } },
      { notes: { $regex: escaped, $options: "i" } },
    ];
    if (mongoose.Types.ObjectId.isValid(searchTerm)) {
      orClauses.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
    }
    filter.$or = orClauses;
  }

  const [rows, total] = await Promise.all([
    WalletRecharge.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    WalletRecharge.countDocuments(filter),
  ]);

  const enrichedRows = rows.map((row) => ({
    ...row,
    transactionCode: row.transactionCode || buildMrcCode(row._id),
    bankTransactionId: row.providerPaymentId || "",
  }));

  return {
    rows: enrichedRows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

module.exports = {
  WALLET_MIN_BALANCE,
  round2,
  normalizeCompanyID,
  getOrCreateWallet,
  getWalletSummary,
  isWalletEnabledForCompany,
  assertWalletMinBalance,
  assertWalletCanAfford,
  ensureWalletReadyForShipment,
  applyWalletMutation,
  debitForOrder,
  debitOrderChargeAdjustment,
  logOrderWalletFieldChange,
  refundOrderCancellation,
  adminAdjustWallet,
  ADMIN_ADJUSTMENT_REASONS,
  listTransactions,
  listRecharges,
};
