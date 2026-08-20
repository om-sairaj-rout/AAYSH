const VOLUMETRIC_DIVISOR = 4000;

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const calculateVolumetricWeight = (length, breadth, height) => {
  const l = toPositiveNumber(length);
  const b = toPositiveNumber(breadth);
  const h = toPositiveNumber(height);

  if (!l || !b || !h) {
    return 0;
  }

  return Number(((l * b * h) / VOLUMETRIC_DIVISOR).toFixed(3));
};

const calculateChargeableWeight = ({
  actualWeight = 0,
  length = 0,
  breadth = 0,
  height = 0,
}) => {
  const actual = toPositiveNumber(actualWeight);
  const volumetric = calculateVolumetricWeight(length, breadth, height);
  const chargeable = Math.max(actual, volumetric);

  return {
    actualWeight: actual,
    volumetricWeight: volumetric,
    chargeableWeight: Number(chargeable.toFixed(3)),
  };
};

const resolveOrderWeights = ({
  weight,
  length = 0,
  breadth = 0,
  height = 0,
}) =>
  calculateChargeableWeight({
    actualWeight: weight,
    length,
    breadth,
    height,
  });

module.exports = {
  VOLUMETRIC_DIVISOR,
  calculateVolumetricWeight,
  calculateChargeableWeight,
  resolveOrderWeights,
};
