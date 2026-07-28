const mongoose = require("mongoose");

const awbSchema =
  new mongoose.Schema(
    {
      courierId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Courier",
        required: true,
      },

      awbNumber: {
        type: String,
        required: true,
        unique: true,
      },

      category: {
        type: String,
        enum: [
          "under1kg",
          "over3kg",
          "prime",
        ],
        required: true,
      },

      status: {
        type: String,
        enum: [
          "available",
          "booked",
        ],
        default: "available",
      },

      assignedOrder: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );
  
module.exports =
  mongoose.model(
    "Awb",
    awbSchema
  );