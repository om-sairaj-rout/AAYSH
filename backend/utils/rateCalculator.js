const { RATE_ZONES, RATE_SERVICES } = require("../constants/rateZones");
const { calculateChargeableWeight } = require("./weightCalculations");

const normalizeService = (service) => {
  const value = String(service || "").trim().toLowerCase();
  if (value === "sur") return "surface";
  return value;
};

const normalizeZoneRateMap = (zoneRates = {}) => {
  if (zoneRates instanceof Map) {
    return Object.fromEntries(zoneRates.entries());
  }
  return zoneRates || {};
};

const findMatchingSlab = (slabs = [], weight) => {
  const activeSlabs = (slabs || []).filter((slab) => slab.isActive !== false);

  const matches = activeSlabs.filter((slab) => {
    const minWeight = Number(slab.minWeight) || 0;
    const maxWeight =
      slab.maxWeight === null || slab.maxWeight === undefined
        ? null
        : Number(slab.maxWeight);

    if (weight < minWeight) return false;
    if (maxWeight !== null && Number.isFinite(maxWeight) && weight >= maxWeight) {
      return false;
    }
    return true;
  });

  if (!matches.length) return null;

  return matches.sort((a, b) => {
    const minDiff = (Number(b.minWeight) || 0) - (Number(a.minWeight) || 0);
    if (minDiff !== 0) return minDiff;
    return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
  })[0];
};

const calculateSlabRate = (slab, zone, weight) => {
  const zoneRates = normalizeZoneRateMap(slab.zoneRates);
  const zoneRate = zoneRates[zone];

  if (!zoneRate) {
    return {
      success: false,
      message: `No rate configured for zone "${zone}" in slab "${slab.name}"`,
    };
  }

  const baseWeight = Number(slab.baseWeight) || 0;
  const incrementStep = Number(slab.incrementStep) || 0;
  const baseRate = Number(zoneRate.baseRate) || 0;
  const incrementRate = Number(zoneRate.incrementRate) || 0;

  if (weight <= baseWeight || incrementStep <= 0) {
    return {
      success: true,
      total: Number(baseRate.toFixed(2)),
      baseRate: Number(baseRate.toFixed(2)),
      incrementUnits: 0,
      incrementCharge: 0,
      incrementStep,
      baseWeight,
    };
  }

  const excess = weight - baseWeight;
  const incrementUnits = Math.ceil(excess / incrementStep);
  const incrementCharge = incrementUnits * incrementRate;
  const total = baseRate + incrementCharge;

  return {
    success: true,
    total: Number(total.toFixed(2)),
    baseRate: Number(baseRate.toFixed(2)),
    incrementUnits,
    incrementCharge: Number(incrementCharge.toFixed(2)),
    incrementStep,
    baseWeight,
  };
};

const calculateRate = ({
  service,
  weight,
  length = 0,
  breadth = 0,
  height = 0,
  zone,
  slabs = [],
}) => {
  const normalizedService = normalizeService(service);

  if (!RATE_SERVICES.includes(normalizedService)) {
    return {
      success: false,
      message: "Invalid service type. Use SUR, AIR, or PRIME.",
    };
  }

  if (!zone || !RATE_ZONES.includes(zone)) {
    return {
      success: false,
      message: "Valid destination zone is required.",
    };
  }

  const weightInfo = calculateChargeableWeight({
    actualWeight: weight,
    length,
    breadth,
    height,
  });

  const chargeableWeight = weightInfo.chargeableWeight;

  if (chargeableWeight <= 0) {
    return {
      success: false,
      message: "Weight must be greater than zero.",
    };
  }

  const slab = findMatchingSlab(slabs, chargeableWeight);

  if (!slab) {
    return {
      success: false,
      message: "No matching weight slab found for the given weight.",
      service: normalizedService,
      zone,
      chargeableWeight,
      weightInfo,
    };
  }

  const rateResult = calculateSlabRate(slab, zone, chargeableWeight);

  if (!rateResult.success) {
    return {
      success: false,
      message: rateResult.message,
      service: normalizedService,
      zone,
      chargeableWeight,
      weightInfo,
    };
  }

  return {
    success: true,
    service: normalizedService,
    zone,
    chargeableWeight,
    weightInfo,
    slab: {
      id: slab._id ? String(slab._id) : slab.id || null,
      name: slab.name,
      minWeight: slab.minWeight,
      maxWeight: slab.maxWeight,
      baseWeight: slab.baseWeight,
      incrementStep: slab.incrementStep,
    },
    rate: {
      total: rateResult.total,
      baseRate: rateResult.baseRate,
      incrementUnits: rateResult.incrementUnits,
      incrementCharge: rateResult.incrementCharge,
      perKg:
        chargeableWeight > 0
          ? Number((rateResult.total / chargeableWeight).toFixed(2))
          : 0,
    },
  };
};

const formatSlabForResponse = (slab) => {
  const zoneRates = normalizeZoneRateMap(slab.zoneRates);
  const formattedZoneRates = {};

  RATE_ZONES.forEach((zone) => {
    formattedZoneRates[zone] = {
      baseRate: Number(zoneRates[zone]?.baseRate || 0),
      incrementRate: Number(zoneRates[zone]?.incrementRate || 0),
    };
  });

  return {
    id: slab._id ? String(slab._id) : slab.id || null,
    name: slab.name,
    minWeight: Number(slab.minWeight) || 0,
    maxWeight:
      slab.maxWeight === null || slab.maxWeight === undefined
        ? null
        : Number(slab.maxWeight),
    baseWeight: Number(slab.baseWeight) || 0,
    incrementStep: Number(slab.incrementStep) || 0,
    zoneRates: formattedZoneRates,
    sortOrder: Number(slab.sortOrder) || 0,
    isActive: slab.isActive !== false,
  };
};

const formatRateStructureForResponse = (doc) => ({
  service: doc.service,
  slabs: (doc.slabs || [])
    .map(formatSlabForResponse)
    .sort((a, b) => a.sortOrder - b.sortOrder),
  updatedAt: doc.updatedAt,
});

const buildDefaultZoneRates = () =>
  RATE_ZONES.reduce((acc, zone) => {
    acc[zone] = { baseRate: 0, incrementRate: 0 };
    return acc;
  }, {});

const normalizeSlabInput = (slab, index = 0) => {
  const zoneRatesInput = slab.zoneRates || {};
  const zoneRates = buildDefaultZoneRates();

  RATE_ZONES.forEach((zone) => {
    zoneRates[zone] = {
      baseRate: Number(zoneRatesInput[zone]?.baseRate || 0),
      incrementRate: Number(zoneRatesInput[zone]?.incrementRate || 0),
    };
  });

  const maxWeight =
    slab.maxWeight === "" || slab.maxWeight === undefined || slab.maxWeight === null
      ? null
      : Number(slab.maxWeight);

  return {
    name: String(slab.name || "").trim(),
    minWeight: Number(slab.minWeight) || 0,
    maxWeight: Number.isFinite(maxWeight) ? maxWeight : null,
    baseWeight: Number(slab.baseWeight) || 0,
    incrementStep: Number(slab.incrementStep) || 0,
    zoneRates,
    sortOrder: Number(slab.sortOrder ?? index),
    isActive: slab.isActive !== false,
  };
};

module.exports = {
  RATE_ZONES,
  normalizeService,
  findMatchingSlab,
  calculateSlabRate,
  calculateRate,
  formatSlabForResponse,
  formatRateStructureForResponse,
  normalizeSlabInput,
  buildDefaultZoneRates,
};
