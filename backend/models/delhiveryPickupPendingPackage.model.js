const mongoose = require("mongoose");

const DelhiveryPickupPendingPackageSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    shippingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipping",
      required: true,
      index: true,
    },
    companyID: { type: String, required: true, uppercase: true, index: true },
    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryPickupLocation",
      default: null,
      index: true,
    },
    pickupLocationName: { type: String, default: "", trim: true },
    pickupDate: { type: String, required: true, index: true },
    packageCount: { type: Number, required: true, min: 1 },
    waybills: { type: [String], default: [] },
    status: {
      type: String,
      enum: [
        "awaiting_warehouse",
        "pending",
        "processing_claimed",
        "queued_behind_open",
        "waiting_for_closure",
        "attached",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    claimToken: { type: String, default: "", index: true },
    claimExpiresAt: { type: Date, default: null, index: true },
    pickupRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryPickupRequest",
      default: null,
      index: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

DelhiveryPickupPendingPackageSchema.index({
  companyID: 1,
  pickupLocationId: 1,
  pickupDate: 1,
  status: 1,
});

module.exports =
  mongoose.models.DelhiveryPickupPendingPackage ||
  mongoose.model(
    "DelhiveryPickupPendingPackage",
    DelhiveryPickupPendingPackageSchema
  );