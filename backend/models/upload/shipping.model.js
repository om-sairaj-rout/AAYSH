const mongoose = require("mongoose");

const ShippingSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },

    shipmentId: {
      type: String,
      default: "",
      index: true,
    },

    awbNumber: {
      type: String,
      default: "",
      index: true,
    },

    courierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courier",
      default: null,
    },

    courierName: {
      type: String,
      default: "",
    },

    pickupLocation: {
      type: String,
      default: "",
    },

    shippingStatus: {
      type: String,
      enum: [
          "Not Shipped",
            "Booked",
            "Shipped",
            "In Transit",
            "Out For Delivery",
            "Delivered",
            "Cancelled",
            "Delayed",
            "RTO",
      ],
      default: "Not Shipped",
    },

    shippingCharges: {
      type: Number,
      default: 0,
    },

    totalWeight: {
      type: Number,
      default: 0,
    },

    bookedAt: Date,

    shippedAt: Date,

    outForDeliveryAt: Date,

    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipping", ShippingSchema);