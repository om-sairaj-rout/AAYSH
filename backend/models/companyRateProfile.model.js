const mongoose = require("mongoose");

const companyRateProfileSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    rovIncluded: {
      type: Boolean,
      default: false,
    },
    docChargeBelow3kg: {
      type: Number,
      default: 0,
      min: 0,
    },
    docChargeAbove3kg: {
      type: Number,
      default: 0,
      min: 0,
    },
    docChargePrime: {
      type: Number,
      default: 0,
      min: 0,
    },
    fuelSurchargePercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CompanyRateProfile ||
  mongoose.model("CompanyRateProfile", companyRateProfileSchema);
