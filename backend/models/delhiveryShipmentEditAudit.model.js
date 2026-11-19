const mongoose = require("mongoose");

const DelhiveryShipmentEditAuditSchema = new mongoose.Schema(
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
    waybills: { type: [String], default: [] },
    changedFields: { type: [String], default: [] },
    previousValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestedValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    delhiveryPayloads: { type: mongoose.Schema.Types.Mixed, default: [] },
    delhiveryResponses: { type: mongoose.Schema.Types.Mixed, default: [] },
    success: { type: Boolean, default: false, index: true },
    uncertain: { type: Boolean, default: false },
    errorMessage: { type: String, default: "" },
    delhiveryStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },
    note: { type: String, default: "" },
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryShipmentEditOperation",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

DelhiveryShipmentEditAuditSchema.index({ orderId: 1, createdAt: -1 });

module.exports =
  mongoose.models.DelhiveryShipmentEditAudit ||
  mongoose.model("DelhiveryShipmentEditAudit", DelhiveryShipmentEditAuditSchema);
