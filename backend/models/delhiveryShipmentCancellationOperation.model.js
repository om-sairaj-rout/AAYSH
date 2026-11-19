const mongoose = require("mongoose");

const waybillResultSchema = new mongoose.Schema(
  {
    waybill: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "request_sent", "succeeded", "failed", "uncertain"],
      default: "pending",
    },
    requestSentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    httpStatus: { type: Number, default: null },
    responseSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: "" },
    definiteFailure: { type: Boolean, default: false },
    verificationOutcome: { type: String, default: "" },
    verificationMessage: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const DelhiveryShipmentCancellationOperationSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shipmentType: { type: String, default: "forward" },
    paymentMode: { type: String, default: "" },
    waybills: { type: [String], default: [] },
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
    waybillResults: { type: [waybillResultSchema], default: [] },
    localSyncApplied: { type: Boolean, default: false },
    lastError: { type: String, default: "" },
    apiResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    note: { type: String, default: "" },
    isMps: { type: Boolean, default: false },
    mpsCancelMode: { type: String, default: "" },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DelhiveryShipmentCancellationOperationSchema.index({
  companyID: 1,
  operationStatus: 1,
});

module.exports =
  mongoose.models.DelhiveryShipmentCancellationOperation ||
  mongoose.model(
    "DelhiveryShipmentCancellationOperation",
    DelhiveryShipmentCancellationOperationSchema
  );