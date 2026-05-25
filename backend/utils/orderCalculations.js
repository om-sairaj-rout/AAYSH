const getCategory = require("./categoryMapper");
const getExpectedHours = require("./tatMapper");

const orderCalculations = (order) => {
  const pickupDate = new Date(order.pickupDate);
  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate)
    : null;

  const referenceDate = deliveryDate || new Date();

  const diffTime =
    referenceDate.getTime() - pickupDate.getTime();

  // ACTUAL HOURS
  const actualHours = Math.floor(
    diffTime / (1000 * 60 * 60)
  );

  // AGEING (only for open shipments)
  const ageing = deliveryDate
    ? 0
    : Math.floor(actualHours / 24);

  // CATEGORY
  const category = getCategory(order.destinationCity);

  // EXPECTED HOURS
  const expectedHours = getExpectedHours(category);

  // SLA STATUS
  const slaStatus =
    actualHours > expectedHours ? "Breach" : "Meet";

  return {
    ageing,
    actualHours,
    slaStatus,
    category,
    expectedHours,
  };
};

module.exports = orderCalculations;