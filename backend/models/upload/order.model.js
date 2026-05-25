const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Upload Tracking
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UploadHistory",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Pickup
    pickupDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Parties
    consignorName: {
      type: String,
      trim: true,
    },

    consigneeName: {
      type: String,
      trim: true,
    },

    // Address
    address: {
      type: String,
      trim: true,
    },

    contactNo: {
      type: String,
      trim: true,
    },

    // Destination
    destinationCity: {
      type: String,
      trim: true,
      index: true,
    },

    destinationState: {
      type: String,
      trim: true,
    },

    destinationPincode: {
      type: String,
      trim: true,
    },

    // Shipment
    qty: {
      type: Number,
      default: 1,
    },

    invoiceNo: {
      type: String,
      trim: true,
    },

    invoiceValue: {
      type: Number,
      default: 0,
    },

    // Manual Update Later
    weight: {
      type: Number,
      default: 0,
    },

    courierStatus: {
  type: String,
  enum: [
    "Not Shipped",
    "Booked",
    "In Transit",
    "RTO",
    "Delivered",
    "Cancelled",
    "Delayed"
  ],
  default: "Not Shipped",
  index: true,
},

    awbNumber: {
  type: String,
  trim: true,
  default: null,
  index: true,
},

deliveryDate: {
  type: Date,
  default: null,
},

bookedAt: {
  type: Date,
  default: null,
},

    // Auto Fields
    category: {
      type: String,
      default: "Rest of India",
    },

    expectedHours: {
      type: Number,
      default: 144,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Order",
  OrderSchema
);