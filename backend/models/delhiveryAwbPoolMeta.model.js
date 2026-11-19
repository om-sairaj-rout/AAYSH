const mongoose = require("mongoose");

const POOL_META_KEY = "default";

const DelhiveryAwbPoolMetaSchema = new mongoose.Schema(
  {
    poolKey: {
      type: String,
      default: POOL_META_KEY,
      unique: true,
    },
    replenishmentRunning: {
      type: Boolean,
      default: false,
    },
    replenishmentLockUntil: {
      type: Date,
      default: null,
    },
    lastBulkRequestAt: {
      type: Date,
      default: null,
    },
    lastReplenishmentAt: {
      type: Date,
      default: null,
    },
    lastReplenishmentStatus: {
      type: String,
      enum: ["idle", "running", "success", "failed", "skipped"],
      default: "idle",
    },
    lastRequestedCount: {
      type: Number,
      default: 0,
    },
    lastReceivedCount: {
      type: Number,
      default: 0,
    },
    lastSavedCount: {
      type: Number,
      default: 0,
    },
    lastDuplicateCount: {
      type: Number,
      default: 0,
    },
    lastInvalidCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: "",
    },
    lastTrigger: {
      type: String,
      default: "",
    },
    fetchHistory: {
      type: [
        {
          at: { type: Date, default: Date.now },
          trigger: String,
          requested: Number,
          received: Number,
          saved: Number,
          duplicates: Number,
          invalid: Number,
          status: String,
          error: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

DelhiveryAwbPoolMetaSchema.statics.getPoolMeta = async function () {
  return this.findOneAndUpdate(
    { poolKey: POOL_META_KEY },
    { $setOnInsert: { poolKey: POOL_META_KEY } },
    { upsert: true, new: true }
  );
};

module.exports = {
  DelhiveryAwbPoolMeta:
    mongoose.models.DelhiveryAwbPoolMeta ||
    mongoose.model("DelhiveryAwbPoolMeta", DelhiveryAwbPoolMetaSchema),
  POOL_META_KEY,
};
