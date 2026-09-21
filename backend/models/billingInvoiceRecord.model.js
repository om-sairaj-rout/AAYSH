const mongoose = require("mongoose");

const BillingInvoiceRecordSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    companyID: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },
    billingMonth: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    billPeriodFrom: {
      type: String,
      default: "",
      trim: true,
    },
    billPeriodTo: {
      type: String,
      default: "",
      trim: true,
    },
    billAmount: {
      type: Number,
      required: true,
    },
    lineCount: {
      type: Number,
      default: 0,
    },
    invoiceSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true }
);

BillingInvoiceRecordSchema.index({ billingMonth: 1, invoiceDate: -1 });

module.exports = mongoose.model("BillingInvoiceRecord", BillingInvoiceRecordSchema);
