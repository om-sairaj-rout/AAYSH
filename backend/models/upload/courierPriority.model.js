const mongoose = require("mongoose");

const courierPrioritySchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: [
        "prime",
        "surface",
        "air",
      ],
      required: true,
      unique: true,
    },

    priority: [
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

        order: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "CourierPriority",
  courierPrioritySchema
);