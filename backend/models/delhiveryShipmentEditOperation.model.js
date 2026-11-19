const mongoose = require("mongoose");

const waybillResultSchema = new mongoose.Schema(
  {
    waybill: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "request_sent", "succeeded", "failed", "uncertain"],
      default: "pending",
    },
    attemptedAt: { type: Date, default: null },
    httpStatus: { type: Number, default: null },
    responseSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: "" },
    requestSentAt: { type: Date, default: null },
    definiteFailure: { type: Boolean, default: false },
    verificationOutcome: { type: String, default: "" },
    verificationMessage: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const DelhiveryShipmentEditOperationSchema = new mongoose.Schema(
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
    operationStatus: {
      type: String,
      enum: [
        "in_progress",
        "completed",
        "incomplete",
        "uncertain",
        "failed",
        "local_sync_failed",
      ],
      default: "in_progress",
      index: true,
    },
    lockOwnerToken: { type: String, default: "", index: true },
    lockExpiresAt: { type: Date, default: null, index: true },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changeFingerprint: { type: String, default: "" },
    paymentModeChange: { type: Boolean, default: false },
    requestedChanges: { type: mongoose.Schema.Types.Mixed, default: {} },
    payloadTemplate: { type: mongoose.Schema.Types.Mixed, default: {} },
    waybillResults: { type: [waybillResultSchema], default: [] },
    localSyncApplied: { type: Boolean, default: false },
    auditId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryShipmentEditAudit",
      default: null,
    },
    lastError: { type: String, default: "" },
    isMps: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DelhiveryShipmentEditOperationSchema.index({ companyID: 1, operationStatus: 1 });

module.exports =
  mongoose.models.DelhiveryShipmentEditOperation ||
  mongoose.model(
    "DelhiveryShipmentEditOperation",
    DelhiveryShipmentEditOperationSchema
  );
