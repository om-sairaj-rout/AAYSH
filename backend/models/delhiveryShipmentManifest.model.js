const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    waybill: { type: String, default: "" },
    weightGrams: { type: Number, default: 0 },
    lengthCm: { type: Number, default: 0 },
    widthCm: { type: Number, default: 0 },
    heightCm: { type: Number, default: 0 },
    codAmount: { type: Number, default: 0 },
    delhiveryStatus: { type: String, default: "" },
  },
  { _id: false }
);

const DelhiveryShipmentManifestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    companyID: { type: String, required: true, uppercase: true, index: true },
    externalOrderId: { type: String, default: "", index: true },
    shipmentType: { type: String, enum: ["SPS", "MPS"], default: "SPS" },
    masterAwb: { type: String, default: "", index: true },
    childAwbs: { type: [String], default: [] },
    pickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryPickupLocation",
      default: null,
    },
    pickupFacilityName: { type: String, default: "" },
    serviceType: {
      type: String,
      enum: ["surface", "air", "prime", null],
      default: null,
    },
    manifestStatus: {
      type: String,
      enum: [
        "idle",
        "running",
        "success",
        "failed",
        "uncertain",
        "reconciliation_required",
      ],
      default: "idle",
      index: true,
    },
    idempotencyKey: { type: String, default: "", index: true },
    lockOwnerToken: { type: String, default: "", index: true },
    lockExpiresAt: { type: Date, default: null },
    cmuRequestSentAt: { type: Date, default: null },
    reconciliationRequired: { type: Boolean, default: false, index: true },
    reconciliationNote: { type: String, default: "" },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reconciledAt: { type: Date, default: null },
    reconciliationPhase: {
      type: String,
      enum: [
        "none",
        "reconciliation_in_progress",
        "reconciliation_failed",
        "reconciliation_completed",
      ],
      default: "none",
      index: true,
    },
    reconciliationClaimToken: { type: String, default: "", index: true },
    reconciliationClaimedAt: { type: Date, default: null },
    reconciliationClaimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reconciliationPendingAwbIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "DelhiveryAwb" }],
      default: [],
    },
    reconciliationLastError: { type: String, default: "" },
    walletDebitedBeforeManifest: { type: Boolean, default: false },
    walletReconciliationRequired: { type: Boolean, default: false },
    walletReconciliationReason: { type: String, default: "" },
    lastError: { type: String, default: "" },
    manifestedAt: { type: Date, default: null },
    httpStatus: { type: Number, default: null },
    packages: { type: [packageSchema], default: [] },
    delhiveryResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    requestSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DelhiveryShipmentManifest ||
  mongoose.model("DelhiveryShipmentManifest", DelhiveryShipmentManifestSchema);
