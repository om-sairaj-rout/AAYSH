const mongoose = require("mongoose");

const deliveryAttemptHistorySchema = new mongoose.Schema(
  {
    attemptNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["In Progress", "Failed", "Delivered"],
      required: true,
    },
    failureReason: {
      type: String,
      default: "",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const ShippingSchema = new mongoose.Schema(  {
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

    requestedPickupDate: {
      type: Date,
      default: null,
    },

    actualPickupDate: {
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
    "Completed",
    "Cancelled",
  ],
  default: "Pending",
  index: true,
},

failureReason: {
  type: String,
  default: "",
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
  "Undelivered",
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

deliveryAttemptHistory: {
  type: [deliveryAttemptHistorySchema],
  default: [],
},

serviceType: {    type: String,
    enum: [
        "prime",
        "surface",
        "air"
    ],
    default: null,
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

    podDocument: {
      fileName: { type: String, default: "" },
      s3Key: { type: String, default: "" },
      s3Bucket: { type: String, default: "" },
      contentType: { type: String, default: "" },
      uploadedAt: { type: Date, default: null },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

    delhiveryManifestStatus: {
      type: String,
      enum: ["idle", "running", "success", "failed", "uncertain"],
    },
    delhiveryShipmentType: {
      type: String,
      enum: ["SPS", "MPS"],
    },
    delhiveryMasterAwb: { type: String, default: "" },
    delhiveryChildAwbs: { type: [String], default: [] },
    delhiveryPickupLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryPickupLocation",
      default: null,
    },
    delhiveryPickupFacilityName: { type: String, default: "" },
    delhiveryManifestedAt: { type: Date, default: null },
    delhiveryEditOperationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryShipmentEditOperation",
      default: null,
    },
    delhiveryEditOperationStatus: {
      type: String,
      default: "",
      index: true,
    },
    delhiveryCancelOperationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DelhiveryShipmentCancellationOperation",
      default: null,
    },
    delhiveryCancelOperationStatus: {
      type: String,
      default: "",
      index: true,
    },
    delhiveryCourierCancellationConfirmedAt: {
      type: Date,
      default: null,
    },
    delhiveryTrackingNextPollAt: {
      type: Date,
      default: null,
      index: true,
    },
    delhiveryLastSyncedScanAt: {
      type: Date,
      default: null,
    },
    delhiveryLastSyncedScanKey: {
      type: String,
      default: "",
    },
    delhiveryTrackingLastError: {
      type: String,
      default: "",
    },
    delhiveryPackageTrackCursors: {
      type: [
        {
          waybill: { type: String, default: "" },
          lastSyncedScanAt: { type: Date, default: null },
          lastSyncedScanKey: { type: String, default: "" },
        },
      ],
      default: [],
    },
    delhiveryTrackingClaimToken: {
      type: String,
      default: "",
      index: true,
    },
    delhiveryTrackingClaimExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    trackonTrackingNextPollAt: {
      type: Date,
      default: null,
      index: true,
    },
    trackonLastSyncedEventAt: {
      type: Date,
      default: null,
    },
    trackonLastSyncedEventKey: {
      type: String,
      default: "",
    },
    trackonTrackingLastError: {
      type: String,
      default: "",
    },
    trackonPackageTrackCursors: {
      type: [
        {
          waybill: { type: String, default: "" },
          lastSyncedScanAt: { type: Date, default: null },
          lastSyncedScanKey: { type: String, default: "" },
        },
      ],
      default: [],
    },
    trackonTrackingClaimToken: {
      type: String,
      default: "",
      index: true,
    },
    trackonTrackingClaimExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

  },
  {
    timestamps: true,
  }
);

ShippingSchema.index({ pickupDate: 1, pickupStatus: 1 });
ShippingSchema.index({ pickupStatus: 1, shippingStatus: 1 });

module.exports = mongoose.model("Shipping", ShippingSchema);