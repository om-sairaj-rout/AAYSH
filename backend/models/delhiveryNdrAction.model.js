const mongoose = require("mongoose");

const DelhiveryNdrActionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    companyID: { type: String, required: true, uppercase: true, index: true },
    waybill: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["RE-ATTEMPT", "PICKUP_RESCHEDULE"],
      required: true,
      index: true,
    },
    uplId: { type: String, default: "", index: true },
    requestStatus: {
      type: String,
      enum: ["submitted", "uncertain", "failed", "closed"],
      default: "submitted",
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    submittedAt: { type: Date, default: Date.now, index: true },
    lastError: { type: String, default: "" },
    nslCodeAtSubmit: { type: String, default: "" },
    attemptCountAtSubmit: { type: Number, default: null },
    delhiveryStatusAtSubmit: { type: String, default: "" },
    submitRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    submitResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    uplStatusResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    lastUplStatusCheckAt: { type: Date, default: null },
    acknowledgedAfter9PmIst: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DelhiveryNdrActionSchema.index(
  { waybill: 1, action: 1 },
  {
    unique: true,
    partialFilterExpression: {
      requestStatus: { $in: ["submitted", "uncertain"] },
    },
  }
);

DelhiveryNdrActionSchema.index({ orderId: 1, createdAt: -1 });

module.exports =
  mongoose.models.DelhiveryNdrAction ||
  mongoose.model("DelhiveryNdrAction", DelhiveryNdrActionSchema);