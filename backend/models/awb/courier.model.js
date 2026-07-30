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