const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    address: { type: String, default: "" },
    zip_code: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    website: { type: String, default: "" },
    logo: { type: String, default: "" },
    gstin: { type: String, default: "" },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Company || mongoose.model("Company", companySchema);
