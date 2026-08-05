const getCategory = require("./categoryMapper");
const getExpectedHours = require("./tatMapper");

const orderCalculations = (order, shipping) => {
  const pickupDate = order.pickupDate
    ? new Date(order.pickupDate)
    : new Date();

  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate)
    : null;

  const referenceDate = deliveryDate || new Date();

  // ==========================
  // ACTUAL HOURS
  // ==========================
  const actualHours = Math.max(
    0,
    Math.floor(
      (referenceDate.getTime() - pickupDate.getTime()) /
        (1000 * 60 * 60)
    )
  );

  // ==========================
  // AGEING (Only Open Orders)
  // ==========================
  const ageing = deliveryDate
    ? 0
    : Math.floor(actualHours / 24);

  // ==========================
  // CATEGORY
  // ==========================
  const category =
  order.category ||
  getCategory(
    order.destinationCity,
    order.destinationState
  );

  const serviceType =
  shipping?.serviceType || "Surface";

  // ==========================
  // EXPECTED HOURS
  // ==========================
  const expectedHours =
    order.expectedHours ||
    getExpectedHours(category,serviceType);

  // ==========================
  // SLA STATUS
  // ==========================
let slaStatus = "Meet";

if (
  shipping?.shippingStatus !== "Delivered" &&
  actualHours > expectedHours
) {
  slaStatus = "Breach";
}

if (
  shipping?.shippingStatus === "Delivered" &&
  deliveryDate &&
  actualHours > expectedHours
) {
  slaStatus = "Breach";
}

  return {
    ageing,
    actualHours,
    slaStatus,
    category,
    expectedHours,
  };
};

module.exports = orderCalculations;