const mongoose = require("mongoose");



const WhatsAppNotificationSchema = new mongoose.Schema(

  {

    shippingId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Shipping",

      required: true,

      index: true,

    },

    shipmentId: {

      type: String,

      default: "",

      index: true,

    },

    customerPhone: {

      type: String,

      default: "",

    },

    awbNumber: {

      type: String,

      default: "",

    },

    orderId: {

      type: String,

      default: "",

    },

    notificationEvent: {

      type: String,

      required: true,

      enum: ["Shipped", "Out For Delivery", "Delivered"],

    },

    templateName: {

      type: String,

      required: true,

    },

    provider: {

      type: String,

      default: "MSG91",

    },

    messageStatus: {

      type: String,

      enum: ["pending", "sent", "failed"],

      default: "pending",

    },

    providerRequestId: {

      type: String,

      default: "",

    },

    failureReason: {

      type: String,

      default: "",

    },

    sentAt: {

      type: Date,

      default: null,

    },

    deliveredAt: {

      type: Date,

      default: null,

    },

  },

  { timestamps: true }

);



WhatsAppNotificationSchema.index(

  { shippingId: 1, notificationEvent: 1 },

  { unique: true }

);



module.exports = mongoose.model(

  "WhatsAppNotification",

  WhatsAppNotificationSchema

);

