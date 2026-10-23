const mongoose = require("mongoose");

const walletRechargeSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentProvider: {
      type: String,
      default: "razorpay",
      trim: true,
    },
    providerOrderId: {
      type: String,
      default: "",
      trim: true,
    },
    providerPaymentId: {
      type: String,
      default: "",
      trim: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    transactionCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
  },
  { timestamps: true }
);

walletRechargeSchema.index({ companyID: 1, createdAt: -1 });
walletRechargeSchema.index(
  { providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerPaymentId: { $type: "string", $ne: "" },
    },
  }
);
walletRechargeSchema.index({ providerOrderId: 1 });

module.exports =
  mongoose.models.WalletRecharge ||
  mongoose.model("WalletRecharge", walletRechargeSchema);
