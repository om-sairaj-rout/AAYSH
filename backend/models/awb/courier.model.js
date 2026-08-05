const mongoose = require("mongoose");

const courierSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      supportsPrime: {
  type: Boolean,
  default: true,
},
 totalPincodes: {
      type: Number,
      default: 0,
    },

    surfacePincodesCount: {
      type: Number,
      default: 0,
    },

    airPincodesCount: {
      type: Number,
      default: 0,
    },

    primePincodesCount: {
      type: Number,
      default: 0,
    },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Courier",
    courierSchema
  );