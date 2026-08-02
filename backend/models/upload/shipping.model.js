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
      required: true,
      unique: true,
      index: true,
    },

    awbNumber: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
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

    pickupDate: {
      type: Date,
      default: null,
    },

    pickupTime: {
      type: String,
      default: "",
    },

    pickupInstructions: {
      type: String,
      default: "",
    },

    pickupLocation: {
      type: String,
      default: "",
    },

    pickupStatus: {
  type: String,
  enum: [
    "Pending",
    "Scheduled",
    "Failed",
    "Completed"
  ],
  default: "Pending",
  index: true,
},

pickedUpAt: {
  type: Date,
  default: null,
},

pickupCancelledAt: {
  type: Date,
  default: null,
},

    shippingStatus: {
      type: String,
      enum: [
  "Pending",
  "Booked",
  "Shipped",
  "In Transit",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
  "Delayed",
  "Delivery Attempt Failed",
],
      default: "Pending",
      index: true,
    },

    deliveryAttempts: {
  type: Number,
  default: 0,
},

attemptFailureReason: {
  type: String,
  default: "",
},

    shippingCharges: {
      type: Number,
      default: 0,
    },

    totalWeight: {
      type: Number,
      default: 0,
    },

bookedAt: {
  type: Date,
  default: null,
},

shippedAt: {
  type: Date,
  default: null,
},

inTransitAt: {
  type: Date,
  default: null,
},

outForDeliveryAt: {
  type: Date,
  default: null,
},

deliveredAt: {
  type: Date,
  default: null,
},

cancelledAt: {
  type: Date,
  default: null,
},

rtoAt: {
  type: Date,
  default: null,
},

returnedAt: {
  type: Date,
  default: null,
},

exchangeAt: {
  type: Date,
  default: null,
},

delayedAt: {
  type: Date,
  default: null,
},

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipping", ShippingSchema);