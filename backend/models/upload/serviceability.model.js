const mongoose = require("mongoose");

const courierServiceSchema = new mongoose.Schema(
  {
    courierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courier",
      required: true,
    },

    courierName: {
      type: String,
      required: true,
      trim: true,
    },

    prime: {
      type: Boolean,
      default: false,
    },

    surface: {
      type: Boolean,
      default: false,
    },

    air: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const pincodeServiceabilitySchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    zone: {
      type: String,
      enum: [
        "LOCAL",
        "NCR",
        "NORTH",
        "REST",
      ],
      required: true,
    },

    couriers: {
      type: [courierServiceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PincodeServiceability",
  pincodeServiceabilitySchema
);