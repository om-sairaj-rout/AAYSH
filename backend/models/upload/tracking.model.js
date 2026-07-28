const mongoose = require("mongoose");

const TrackingSchema = new mongoose.Schema(
  {
    shippingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipping",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "Booked",
        "Shipped",
        "In Transit",
        "Out For Delivery",
        "Delivered",
        "Cancelled",
        "RTO",
      ],
      required: true,
    },

    location: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    eventTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tracking", TrackingSchema);