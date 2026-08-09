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
  // EXPECTED SLA HOURS
  // ==========================
  const expectedHours =
    order.expectedHours ||
    getExpectedHours(category, serviceType);


  // ==========================
  // DATE PARSING
  // ==========================
  const pickupDate = order.pickupDate
    ? new Date(order.pickupDate)
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
  // ACTUAL HOURS
  // ==========================
  let actualHours = Math.floor(
    (referenceDate.getTime() - pickupDate.getTime()) /
    (1000 * 60 * 60)
  );


  // Prevent negative SLA
  actualHours = Math.max(0, actualHours);


  // ==========================
  // AGEING
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


module.exports = orderCalculations;