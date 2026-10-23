const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCredit: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDebit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
