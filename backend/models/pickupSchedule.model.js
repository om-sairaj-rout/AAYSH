const mongoose = require("mongoose");

const pickupScheduleSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    companyID: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
      index: true,
    },
    pickupDate: { type: Date, required: true },
    pickupTime: { type: String, default: "11:00", trim: true },
    pickupLocation: { type: String, required: true, trim: true },
    pickupPincode: { type: String, default: "", trim: true },
    noOfBoxes: { type: Number, default: 1, min: 1 },
    weight: { type: Number, default: 0, min: 0 },
    preferredServiceType: {
      type: String,
      enum: ["surface", "air", "prime"],
      default: "surface",
    },
    notes: { type: String, default: "", trim: true },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    expectedOrderCount: { type: Number, default: 1, min: 1 },
    completedOrders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        externalOrderId: { type: String, default: "" },
        shipmentId: { type: String, default: "" },
        awbNumber: { type: String, default: "" },
        courierName: { type: String, default: "" },
        awbAssigned: { type: Boolean, default: false },
        awbFailureReason: { type: String, default: "" },
        noOfBoxes: { type: Number, default: 1, min: 1 },
      },
    ],
    externalOrderId: { type: String, default: "", trim: true },
    awbAssigned: { type: Boolean, default: false },
    awbNumber: { type: String, default: "", trim: true },
    courierName: { type: String, default: "", trim: true },
    awbFailureReason: { type: String, default: "", trim: true },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PickupSchedule ||
  mongoose.model("PickupSchedule", pickupScheduleSchema);
