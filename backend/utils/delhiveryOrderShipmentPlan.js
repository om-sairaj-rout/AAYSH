const parseBoxCount = (order) =>
  Math.max(1, Number.parseInt(String(order?.noOfBoxes ?? 1), 10) || 1);

/**
 * Derive Delhivery SPS vs MPS from saved order box count (no UI selection).
 */
const buildDelhiveryPackagesFromOrder = (order) => {
  const boxes = parseBoxCount(order);
  if (boxes <= 1) {
    return { shipmentType: "SPS", packages: null };
  }

  const totalWeight = Number(order.chargeableWeight || order.weight) || 0;
  const perWeight = totalWeight > 0 ? totalWeight / boxes : 0;
  const length = Number(order.length) || 0;
  const breadth = Number(order.breadth) || 0;
  const height = Number(order.height) || 0;

  const packages = Array.from({ length: boxes }, (_, index) => ({
    weight: perWeight,
    length,
    breadth,
    height,
    boxIndex: index + 1,
  }));

  return { shipmentType: "MPS", packages };
};

module.exports = {
  parseBoxCount,
  buildDelhiveryPackagesFromOrder,
};