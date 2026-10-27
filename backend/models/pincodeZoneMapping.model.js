const mongoose = require("mongoose");
const { RATE_ZONES } = require("../constants/rateZones");

const pincodeZoneMappingSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    zone: {
      type: String,
      enum: RATE_ZONES,
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PincodeZoneMapping", pincodeZoneMappingSchema);
