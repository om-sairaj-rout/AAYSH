const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Basic Order Details
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    awbNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

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

    // Customer Details
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // Destination Details
    destinationCity: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Weight Details
    weight: {
      type: Number,
      default: 0,
    },

    actualWeight: {
      type: Number,
      default: 0,
    },

    volumetricWeight: {
      type: Number,
      default: 0,
    },

    // Dimensions
    length: {
      type: Number,
      default: 0,
    },

    width: {
      type: Number,
      default: 0,
    },

    height: {
      type: Number,
      default: 0,
    },

    // Charges
    deliveryCharge: {
      type: Number,
      default: 0,
    },

    // Courier
    courierPartner: {
      type: String,
      trim: true,
    },

    // Status
    status: {
      type: String,
      trim: true,
      default: "Pending",
      index: true,
    },

    comments: {
      type: String,
      trim: true,
    },

    // Dates
    orderDate: {
      type: Date,
      index: true,
    },

    expectedDeliveryDate: {
      type: Date,
    },

    firstAttemptDate: {
      type: Date,
    },

    secondAttemptDate: {
      type: Date,
    },

    thirdAttemptDate: {
      type: Date,
    },

    deliveredDate: {
      type: Date,
    },

    // Delivery Details
    receiverName: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);