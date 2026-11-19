const mongoose = require("mongoose");

const DelhiveryAwbSchema = new mongoose.Schema(
  {
    awbNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    courier: {
      type: String,
      default: "Delhivery",
      immutable: true,
    },
    status: {
      type: String,
      enum: ["available", "reserved", "assigned", "used", "failed", "booked"],
      default: "available",
      index: true,
    },
    source: {
      type: String,
      enum: ["bulk", "single"],
      required: true,
    },
    assignedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

DelhiveryAwbSchema.index({ status: 1, createdAt: 1 });

DelhiveryAwbSchema.post("findOneAndUpdate", function (doc) {
  if (!doc) return;

  const filter = this.getFilter?.() || {};
  if (filter.status !== "available") return;

  const update = this.getUpdate?.() || {};
  const nextStatus = update.$set?.status ?? update.status;
  if (!nextStatus || nextStatus === "available") return;

  const {
    scheduleDelhiveryAwbReplenishmentCheck,
  } = require("../services/delhivery/delhiveryAwbReplenishment");
  scheduleDelhiveryAwbReplenishmentCheck();
});

module.exports =
  mongoose.models.DelhiveryAwb ||
  mongoose.model("DelhiveryAwb", DelhiveryAwbSchema);
