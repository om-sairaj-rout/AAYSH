const { RATE_ZONES } = require("./rateZones");
const getCategory = require("../utils/categoryMapper");

/** Active inventory / upload categories */
const AWB_CATEGORY_UNDER1KG_NORTH_NCR = "under1kgNorthNcr";
const AWB_CATEGORY_UNDER1KG_OTHER = "under1kgOtherZones";
const AWB_CATEGORY_ABOVE1KG = "above1kg";
const AWB_CATEGORY_PRIME = "prime";
const AWB_CATEGORY_COD = "codToPay";

/** Legacy values kept for booked / historical AWB rows */
const AWB_LEGACY_CATEGORIES = ["under1kg", "under3kg", "over3kg"];

const AWB_ACTIVE_CATEGORIES = [
  AWB_CATEGORY_UNDER1KG_NORTH_NCR,
  AWB_CATEGORY_UNDER1KG_OTHER,
  AWB_CATEGORY_ABOVE1KG,
  AWB_CATEGORY_PRIME,
  AWB_CATEGORY_COD,
];

const AWB_CATEGORY_ENUM = [...AWB_ACTIVE_CATEGORIES, ...AWB_LEGACY_CATEGORIES];

const AWB_NORTH_OR_NCR_ZONES = ["Local NCR", "North Zone"];

const isNorthOrNcrZone = (zone) =>
  AWB_NORTH_OR_NCR_ZONES.includes(String(zone || "").trim());

const resolveDestinationZoneForAwb = (order, serviceability) => {
  const fromServiceability = serviceability?.zone;
  if (fromServiceability && RATE_ZONES.includes(fromServiceability)) {
    return fromServiceability;
  }

  const fromOrder = order?.category;
  if (fromOrder && RATE_ZONES.includes(fromOrder)) {
    return fromOrder;
  }

  if (order?.destinationCity || order?.destinationState) {
    return getCategory(order.destinationCity, order.destinationState);
  }

  return "";
};

const AWB_CATEGORY_LABELS = {
  [AWB_CATEGORY_UNDER1KG_NORTH_NCR]: "Under 1kg — North/NCR",
  [AWB_CATEGORY_UNDER1KG_OTHER]: "Under 1kg — Other Zones",
  [AWB_CATEGORY_ABOVE1KG]: "Above 1kg",
  [AWB_CATEGORY_PRIME]: "Prime",
  [AWB_CATEGORY_COD]: "COD",
  under1kg: "Under 1kg (legacy)",
  under3kg: "Under 3kg (legacy)",
  over3kg: "Over 3kg (legacy)",
};

module.exports = {
  AWB_CATEGORY_UNDER1KG_NORTH_NCR,
  AWB_CATEGORY_UNDER1KG_OTHER,
  AWB_CATEGORY_ABOVE1KG,
  AWB_CATEGORY_PRIME,
  AWB_CATEGORY_COD,
  AWB_LEGACY_CATEGORIES,
  AWB_ACTIVE_CATEGORIES,
  AWB_CATEGORY_ENUM,
  AWB_NORTH_OR_NCR_ZONES,
  AWB_CATEGORY_LABELS,
  isNorthOrNcrZone,
  resolveDestinationZoneForAwb,
};
