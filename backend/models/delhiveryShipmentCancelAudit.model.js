const mongoose = require("mongoose");

const DelhiveryShipmentCancelAuditSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    companyID: { type: String, required: true, uppercase: true, index: true },
    externalOrderId: { type: String, default: "", index: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryShipmentCancellationOperation",
      default: null,
      index: true,
    },
    waybills: { type: [String], default: [] },
    delhiveryResponses: { type: mongoose.Schema.Types.Mixed, default: [] },
    success: { type: Boolean, default: false, index: true },
    uncertain: { type: Boolean, default: false },
    errorMessage: { type: String, default: "" },
    note: { type: String, default: "" },
    delhiveryStatusAtSubmit: { type: String, default: "" },
  },
  { timestamps: true }
);

DelhiveryShipmentCancelAuditSchema.index({ orderId: 1, createdAt: -1 });

module.exports =
  mongoose.models.DelhiveryShipmentCancelAudit ||
  mongoose.model("DelhiveryShipmentCancelAudit", DelhiveryShipmentCancelAuditSchema);