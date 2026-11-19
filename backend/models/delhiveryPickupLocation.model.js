const mongoose = require("mongoose");

const DelhiveryPickupLocationSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    facilityName: {
      type: String,
      required: true,
      trim: true,
    },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

DelhiveryPickupLocationSchema.index(
  { companyID: 1, facilityName: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.DelhiveryPickupLocation ||
  mongoose.model("DelhiveryPickupLocation", DelhiveryPickupLocationSchema);
