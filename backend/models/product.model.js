const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    hsn: {
      type: String,
      default: "",
      trim: true,
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    length: {
      type: Number,
      default: 0,
      min: 0,
    },
    breadth: {
      type: Number,
      default: 0,
      min: 0,
    },
    height: {
      type: Number,
      default: 0,
      min: 0,
    },
    defaultUnits: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ companyID: 1, sku: 1 });
productSchema.index({ companyID: 1, name: 1 });

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
