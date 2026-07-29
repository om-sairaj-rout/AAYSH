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
  default: false,
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