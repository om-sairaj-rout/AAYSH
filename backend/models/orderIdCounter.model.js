const mongoose = require("mongoose");

const orderIdCounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    sequenceType: {
      type: String,
      required: true,
      enum: ["numeric", "alphanumeric"],
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

module.exports =
  mongoose.models.OrderIdCounter ||
  mongoose.model("OrderIdCounter", orderIdCounterSchema);
