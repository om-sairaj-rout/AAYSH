const mongoose = require("mongoose");

const orderIdCounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    companyID: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    sequenceType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

orderIdCounterSchema.index({ companyID: 1, sequenceType: 1 }, { unique: true });

module.exports =
  mongoose.models.OrderIdCounter ||
  mongoose.model("OrderIdCounter", orderIdCounterSchema);
