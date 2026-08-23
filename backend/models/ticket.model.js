const mongoose = require("mongoose");

const TICKET_CATEGORIES = [
  "Shipment",
  "AWB",
  "Pickup",
  "Billing",
  "Account",
  "Other",
];

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
    attachmentName: { type: String, default: "", trim: true },
    attachmentPath: { type: String, default: "", trim: true },
    s3Key: { type: String, default: "", trim: true },
    s3Bucket: { type: String, default: "", trim: true },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyID: { type: String, default: "", index: true, trim: true, uppercase: true },
    companyName: { type: String, default: "", trim: true },
    fullName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    orderAwbNumber: { type: String, default: "", trim: true, index: true },
    fromName: { type: String, default: "", trim: true },
    fromPhone: { type: String, default: "", trim: true },
    fromAddress: { type: String, default: "", trim: true },
    fromCity: { type: String, default: "", trim: true },
    fromState: { type: String, default: "", trim: true },
    fromPincode: { type: String, default: "", trim: true },
    toName: { type: String, default: "", trim: true },
    toPhone: { type: String, default: "", trim: true },
    toAddress: { type: String, default: "", trim: true },
    toCity: { type: String, default: "", trim: true },
    toState: { type: String, default: "", trim: true },
    toPincode: { type: String, default: "", trim: true },
    unreadForUser: { type: Boolean, default: false, index: true },
    unreadForAdmin: { type: Boolean, default: true, index: true },
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        senderRole: {
          type: String,
          enum: ["user", "admin"],
          required: true,
        },
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminNotes: { type: String, default: "", trim: true },
    adminReply: { type: String, default: "", trim: true },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
module.exports.TICKET_CATEGORIES = TICKET_CATEGORIES;
