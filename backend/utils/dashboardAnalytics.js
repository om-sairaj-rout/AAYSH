const getCategory = require("./categoryMapper");
const orderCalculations = require("./orderCalculations");

const normalizeLabel = (value, fallback = "Unknown") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallback;
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getOrderZone = (order) => {
  if (order.category && String(order.category).trim()) {
    return order.category;
  }
  return getCategory(order.destinationCity, order.destinationState);
};

const getShippingStatus = (order) =>
  order.shipping?.shippingStatus || "Pending";

const createShipmentBucket = () => ({
  total: 0,
  captured: 0,
  pending: 0,
  booked: 0,
  shipped: 0,
  inTransit: 0,
  delivered: 0,
  cancelled: 0,
  rto: 0,
  delayed: 0,
  revenue: 0,
});

const applyShipmentStatus = (bucket, status) => {
  bucket.total += 1;

  switch (status) {
    case "Pending":
      bucket.pending += 1;
      break;
    case "Booked":
      bucket.booked += 1;
      bucket.captured += 1;
      break;
    case "Shipped":
      bucket.shipped += 1;
      bucket.captured += 1;
      break;
    case "In Transit":
    case "Out For Delivery":
      bucket.inTransit += 1;
      bucket.captured += 1;
      break;
    case "Delivered":
      bucket.delivered += 1;
      bucket.captured += 1;
      break;
    case "Cancelled":
      bucket.cancelled += 1;
      bucket.captured += 1;
      break;
    case "RTO":
    case "Returned":
      bucket.rto += 1;
      bucket.captured += 1;
      break;
    case "Delayed":
    case "Delivery Attempt Failed":
      bucket.delayed += 1;
      bucket.captured += 1;
      break;
    default:
      bucket.pending += 1;
      break;
  }
};

const withShare = (rows, totalValue, valueKey = "revenue") =>
  rows
    .map((row) => ({
      ...row,
      sharePercent: totalValue
        ? Math.round((Number(row[valueKey]) / totalValue) * 100)
        : 0,
    }))
    .sort((a, b) => b[valueKey] - a[valueKey]);

const createRiskBucket = () => ({
  total: 0,
  delayed: 0,
  slaBreaches: 0,
  atRisk: 0,
  delivered: 0,
});

const getRiskLevel = (delayRatio) => {
  if (delayRatio <= 0) return "None";
  if (delayRatio < 5) return "Low";
  if (delayRatio < 15) return "Medium";
  if (delayRatio < 30) return "High";
  return "Critical";
};

const getOrderRiskFlags = (order) => {
  const status = getShippingStatus(order);
  const explicitDelay =
    status === "Delayed" || status === "Delivery Attempt Failed";

  let slaBreach = false;
  if (!explicitDelay) {
    const calc = orderCalculations(order, order.shipping || {});
    slaBreach = calc.slaStatus === "Breach";
  }

  return {
    explicitDelay,
    slaBreach,
    atRisk: explicitDelay || slaBreach,
    delivered: status === "Delivered",
  };
};

const finalizeRiskRow = (row, overallDelayRatio) => {
  const delayRatio = row.total
    ? Math.round((row.atRisk / row.total) * 1000) / 10
    : 0;

  const relativeRiskRatio =
    overallDelayRatio > 0
      ? Math.round((delayRatio / overallDelayRatio) * 10) / 10
      : delayRatio > 0
        ? 1
        : 0;

  let riskLevel = getRiskLevel(delayRatio);

  if (relativeRiskRatio >= 2 && riskLevel === "Low") {
    riskLevel = "Medium";
  }
  if (relativeRiskRatio >= 2.5 && riskLevel === "Medium") {
    riskLevel = "High";
  }

  return {
    ...row,
    delayRatio,
    relativeRiskRatio,
    riskLevel,
    riskScore: Math.round(delayRatio * relativeRiskRatio),
  };
};

const buildRiskAnalytics = (yearOrders) => {
  const zoneRiskMap = {};
  const stateRiskMap = {};
  const summary = createRiskBucket();

  yearOrders.forEach((order) => {
    const zone = getOrderZone(order);
    const stateKey = normalizeLabel(order.destinationState, "Unknown");
    const flags = getOrderRiskFlags(order);

    summary.total += 1;
    if (flags.delivered) summary.delivered += 1;
    if (flags.explicitDelay) summary.delayed += 1;
    if (flags.slaBreach) summary.slaBreaches += 1;
    if (flags.atRisk) summary.atRisk += 1;

    if (!zoneRiskMap[zone]) {
      zoneRiskMap[zone] = { zone, ...createRiskBucket() };
    }
    const zoneRow = zoneRiskMap[zone];
    zoneRow.total += 1;
    if (flags.delivered) zoneRow.delivered += 1;
    if (flags.explicitDelay) zoneRow.delayed += 1;
    if (flags.slaBreach) zoneRow.slaBreaches += 1;
    if (flags.atRisk) zoneRow.atRisk += 1;

    if (!stateRiskMap[stateKey]) {
      stateRiskMap[stateKey] = { state: stateKey, ...createRiskBucket() };
    }
    const stateRow = stateRiskMap[stateKey];
    stateRow.total += 1;
    if (flags.delivered) stateRow.delivered += 1;
    if (flags.explicitDelay) stateRow.delayed += 1;
    if (flags.slaBreach) stateRow.slaBreaches += 1;
    if (flags.atRisk) stateRow.atRisk += 1;
  });

  const overallDelayRatio = summary.total
    ? Math.round((summary.atRisk / summary.total) * 1000) / 10
    : 0;

  const byZone = Object.values(zoneRiskMap)
    .map((row) => finalizeRiskRow(row, overallDelayRatio))
    .sort((a, b) => b.riskScore - a.riskScore || b.atRisk - a.atRisk);

  const byState = Object.values(stateRiskMap)
    .map((row) => finalizeRiskRow(row, overallDelayRatio))
    .sort((a, b) => b.riskScore - a.riskScore || b.atRisk - a.atRisk);

  const flaggedZones = byZone.filter(
    (row) => row.riskLevel === "High" || row.riskLevel === "Critical"
  );
  const flaggedStates = byState.filter(
    (row) => row.riskLevel === "High" || row.riskLevel === "Critical"
  );

  return {
    summary: {
      ...summary,
      overallDelayRatio,
      overallRiskLevel: getRiskLevel(overallDelayRatio),
      flaggedZoneCount: flaggedZones.length,
      flaggedStateCount: flaggedStates.length,
    },
    byZone,
    byState,
    flaggedZones,
    flaggedStates,
  };
};

const buildDashboardAnalytics = (yearOrders) => {
  const totalOrders = yearOrders.length;
  const totalRevenue = yearOrders.reduce(
    (sum, order) => sum + Number(order.invoiceValue || 0),
    0
  );

  const paymentBreakdown = {
    cod: { orders: 0, revenue: 0 },
    prepaid: { orders: 0, revenue: 0 },
  };

  const zoneSalesMap = {};
  const stateSalesMap = {};
  const zoneShipmentMap = {};
  const stateShipmentMap = {};

  const shipmentSummary = createShipmentBucket();

  yearOrders.forEach((order) => {
    const revenue = Number(order.invoiceValue || 0);
    const zone = getOrderZone(order);
    const stateKey = normalizeLabel(order.destinationState, "Unknown");
    const status = getShippingStatus(order);

    const paymentKey =
      String(order.paymentMethod || "").toLowerCase() === "prepaid"
        ? "prepaid"
        : "cod";
    paymentBreakdown[paymentKey].orders += 1;
    paymentBreakdown[paymentKey].revenue += revenue;

    if (!zoneSalesMap[zone]) {
      zoneSalesMap[zone] = { zone, orders: 0, revenue: 0 };
    }
    zoneSalesMap[zone].orders += 1;
    zoneSalesMap[zone].revenue += revenue;

    if (!stateSalesMap[stateKey]) {
      stateSalesMap[stateKey] = { state: stateKey, orders: 0, revenue: 0 };
    }
    stateSalesMap[stateKey].orders += 1;
    stateSalesMap[stateKey].revenue += revenue;

    if (!zoneShipmentMap[zone]) {
      zoneShipmentMap[zone] = { zone, ...createShipmentBucket() };
    }
    const zoneBucket = zoneShipmentMap[zone];
    applyShipmentStatus(zoneBucket, status);
    zoneBucket.revenue += revenue;

    if (!stateShipmentMap[stateKey]) {
      stateShipmentMap[stateKey] = { state: stateKey, ...createShipmentBucket() };
    }
    const stateBucket = stateShipmentMap[stateKey];
    applyShipmentStatus(stateBucket, status);
    stateBucket.revenue += revenue;

    applyShipmentStatus(shipmentSummary, status);
    shipmentSummary.revenue += revenue;
  });

  const salesByZone = withShare(Object.values(zoneSalesMap), totalRevenue);
  const salesByState = withShare(Object.values(stateSalesMap), totalRevenue);

  const shipmentByZone = Object.values(zoneShipmentMap).sort(
    (a, b) => b.total - a.total
  );
  const shipmentByState = Object.values(stateShipmentMap).sort(
    (a, b) => b.total - a.total
  );

  const riskAnalytics = buildRiskAnalytics(yearOrders);

  return {
    salesAnalytics: {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders
        ? Math.round(totalRevenue / totalOrders)
        : 0,
      paymentBreakdown,
      byZone: salesByZone,
      byState: salesByState,
    },
    shipmentAnalytics: {
      summary: shipmentSummary,
      captureRate: totalOrders
        ? Math.round((shipmentSummary.captured / totalOrders) * 100)
        : 0,
      deliveryRate: totalOrders
        ? Math.round((shipmentSummary.delivered / totalOrders) * 100)
        : 0,
      byZone: shipmentByZone,
      byState: shipmentByState,
    },
    riskAnalytics,
  };
};

module.exports = {
  buildDashboardAnalytics,
  getOrderZone,
};
