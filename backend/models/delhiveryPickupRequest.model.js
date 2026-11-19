const mongoose = require("mongoose");

const packageReferenceSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    shippingId: { type: mongoose.Schema.Types.ObjectId, ref: "Shipping", required: true },
    packageCount: { type: Number, default: 1 },
    waybills: { type: [String], default: [] },
  },
  { _id: false }
);

const DelhiveryPickupRequestSchema = new mongoose.Schema(
  {
    companyID: { type: String, required: true, uppercase: true, index: true },
    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryPickupLocation",
      required: true,
      index: true,
    },
    pickupLocationName: { type: String, required: true, trim: true },
    pickupDate: { type: String, required: true, index: true },
    pickupTime: { type: String, required: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    expectedPackageCount: { type: Number, required: true, min: 1 },
    orderIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], default: [] },
    waybills: { type: [String], default: [] },
    packageReferences: { type: [packageReferenceSchema], default: [] },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "confirmed",
        "uncertain",
        "failed",
        "closed",
        "partially_pending",
        "duplicate_existing",
      ],
      default: "pending",
      index: true,
    },
    delhiveryResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    delhiveryRequestId: { type: String, default: "", index: true },
    requestPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    requestSentAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closureNote: { type: String, default: "" },
    reconciledExternally: { type: Boolean, default: false },
    reconciliationNote: { type: String, default: "" },
    lastError: { type: String, default: "" },
    lockOwnerToken: { type: String, default: "", index: true },
    lockExpiresAt: { type: Date, default: null },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pendingPackagesQueued: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DelhiveryPickupRequestSchema.index(
  { companyID: 1, pickupLocationId: 1, pickupDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["pending", "processing", "confirmed", "uncertain", "partially_pending"],
      },
    },
  }
);

DelhiveryPickupRequestSchema.index({ companyID: 1, status: 1, pickupDate: -1 });

module.exports =
  mongoose.models.DelhiveryPickupRequest ||
  mongoose.model("DelhiveryPickupRequest", DelhiveryPickupRequestSchema);