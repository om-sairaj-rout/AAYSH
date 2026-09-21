const mongoose = require("mongoose");
const { RATE_ZONES, RATE_SERVICES } = require("../constants/rateZones");

const zoneRateSchema = new mongoose.Schema(
  {
    baseRate: { type: Number, default: 0, min: 0 },
    incrementRate: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const weightSlabSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    minWeight: { type: Number, required: true, min: 0 },
    maxWeight: { type: Number, default: null, min: 0 },
    baseWeight: { type: Number, required: true, min: 0 },
    incrementStep: { type: Number, required: true, min: 0 },
    zoneRates: {
      type: Map,
      of: zoneRateSchema,
      default: () =>
        new Map(
          RATE_ZONES.map((zone) => [zone, { baseRate: 0, incrementRate: 0 }])
        ),
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const companyRateStructureSchema = new mongoose.Schema(
  {
    companyID: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    service: {
      type: String,
      enum: RATE_SERVICES,
      required: true,
      index: true,
    },
    slabs: {
      type: [weightSlabSchema],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

companyRateStructureSchema.index({ companyID: 1, service: 1 }, { unique: true });

module.exports =
  mongoose.models.CompanyRateStructure ||
  mongoose.model("CompanyRateStructure", companyRateStructureSchema);
