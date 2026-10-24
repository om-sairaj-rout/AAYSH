const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: -500,
    },
    category: {
      type: String,
      enum: [
        "recharge",
        "admin_credit",
        "admin_debit",
        "order_charge",
        "order_refund",
        "adjustment",
      ],
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    referenceType: {
      type: String,
      default: "",
      trim: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    rechargeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletRecharge",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index(
  { referenceType: 1, referenceId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      referenceType: { $type: "string", $ne: "" },
      referenceId: { $type: "objectId" },
    },
  }
);

walletTransactionSchema.index({ companyID: 1, createdAt: -1 });
walletTransactionSchema.index(
  { rechargeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      rechargeId: { $type: "objectId" },
    },
  }
);

module.exports =
  mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", walletTransactionSchema);
