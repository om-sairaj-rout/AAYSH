const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },

    sku: {
      type: String,
      default: "",
    },

    units: {
      type: Number,
      default: 1,
    },

    sellingPrice: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    hsn: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);


const OrderSchema = new mongoose.Schema(
  {
    // =====================================
    // Upload History
    // =====================================

    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UploadHistory",
      default: null,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    externalOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },


    // =====================================
    // Order Dates
    // =====================================

    orderDate: {
      type: Date,
      default: null,
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


    // =====================================
    // Customer Details
    // =====================================

    consignorName: {
      type: String,
      default: "",
    },

    consigneeName: {
      type: String,
      default: "",
    },

    consigneeLastName: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    address2: {
      type: String,
      default: "",
    },

    destinationCity: {
      type: String,
      default: "",
    },

    destinationState: {
      type: String,
      default: "",
    },

    destinationPincode: {
      type: String,
      default: "",
    },

    destinationCountry: {
      type: String,
      default: "India",
    },

    consigneeEmail: {
      type: String,
      default: "",
    },

    billingPhone: {
      type: String,
      default: "",
    },

    billingAlternatePhone: {
      type: String,
      default: "",
    },


    // =====================================
    // Order Details
    // =====================================

    paymentMethod: {
      type: String,
      enum: ["COD", "Prepaid"],
      default: "COD",
    },

    comment: {
      type: String,
      default: "",
    },


    orderItems: {
      type: [orderItemSchema],
      default: [],
    },


    invoiceNo: {
      type: String,
      default: "",
    },


    invoiceValue: {
      type: Number,
      default: 0,
    },


    subTotal: {
      type: Number,
      default: 0,
    },


    shippingCharges: {
      type: Number,
      default: 0,
    },


    giftwrapCharges: {
      type: Number,
      default: 0,
    },


    transactionCharges: {
      type: Number,
      default: 0,
    },


    totalDiscount: {
      type: Number,
      default: 0,
    },


    // =====================================
    // Package Details
    // =====================================

    weight: {
      type: Number,
      default: 0,
    },

    length: {
      type: Number,
      default: 0,
    },

    breadth: {
      type: Number,
      default: 0,
    },

    height: {
      type: Number,
      default: 0,
    },

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


module.exports = mongoose.model("Order", OrderSchema);