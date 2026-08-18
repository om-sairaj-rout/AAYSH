const getCategory = require("./categoryMapper");
const getExpectedHours = require("./tatMapper");
const {
  countWorkingHoursBetween,
  addWorkingHours,
} = require("./workingCalendar");

const orderCalculations = (order = {}, shipping = {}) => {
  // ==========================
  // NORMALIZE VALUES
  // ==========================
  const status = shipping?.shippingStatus?.toLowerCase() || "";

  const serviceType =
    shipping?.serviceType?.toLowerCase() || "surface";


  // ==========================
  // CATEGORY
  // ==========================
  const category =
    order.category ||
    getCategory(
      order.destinationCity,
      order.destinationState
    );


  // ==========================
  // EXPECTED SLA HOURS (24h/day budget; Sundays & gov holidays excluded)
  // ==========================
  const expectedHours =
    order.expectedHours ||
    getExpectedHours(category, serviceType);


  // ==========================
  // DATE PARSING
  // ==========================
  const pickupDate = shipping?.pickupDate
    ? new Date(shipping.pickupDate)
    : null;

  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate)
    : null;


  // ==========================
  // INVALID / MISSING PICKUP
  // ==========================
  if (
    !pickupDate ||
    isNaN(pickupDate.getTime())
  ) {
    return {
      ageing: 0,
      actualHours: 0,
      slaStatus: "Pending",
      category,
      expectedHours
    };
  }


  // ==========================
  // REFERENCE DATE
  // ==========================
  const referenceDate =
    deliveryDate &&
    !isNaN(deliveryDate.getTime())
      ? deliveryDate
      : new Date();


  // ==========================
  // ACTUAL HOURS (same calendar rules as addWorkingHours / expected delivery)
  // ==========================
  let actualHours = countWorkingHoursBetween(pickupDate, referenceDate);


  // Prevent negative SLA
  actualHours = Math.max(0, actualHours);


  // ==========================
  // AGEING (full 24h working-day equivalents elapsed while in transit)
  // ==========================
  const ageing =
    deliveryDate
      ? 0
      : Math.floor(actualHours / 24);


  // ==========================
  // SLA STATUS
  // ==========================
  const closedStatuses = [
    "delivered",
    "cancelled",
    "rto"
  ];


  let slaStatus = "Meet";


  if (
    !closedStatuses.includes(status) &&
    actualHours > expectedHours
  ) {
    slaStatus = "Breach";
  }


  // ==========================
  // RESPONSE
  // ==========================
  return {
    ageing,
    actualHours,
    slaStatus,
    category,
    expectedHours
  };
};


/**
 * Expected delivery instant from pickup + SLA working hours.
 * Returns null when pickup/SLA is missing or order is already delivered.
 */
const getExpectedDeliveryDate = (order = {}, shipping = {}) => {
  const status = shipping?.shippingStatus?.toLowerCase() || "";
  if (status === "delivered") return null;

  const pickupDate = shipping?.pickupDate
    ? new Date(shipping.pickupDate)
    : null;

  if (!pickupDate || Number.isNaN(pickupDate.getTime())) return null;

  const { expectedHours } = orderCalculations(order, shipping);
  if (!expectedHours) return null;

  return addWorkingHours(pickupDate, expectedHours);
};

module.exports = orderCalculations;
module.exports.getExpectedDeliveryDate = getExpectedDeliveryDate;
