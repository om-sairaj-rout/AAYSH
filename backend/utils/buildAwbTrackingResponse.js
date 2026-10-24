const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Tracking = require("../models/upload/tracking.model");
const orderCalculations = require("./orderCalculations");
const { toISTDateTime, formatDatesInObject } = require("./dateTime");

const fetchAwbTrackingBundle = async (awbNumber) => {
  const trimmed = String(awbNumber || "").trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: "AWB number is required" };
  }

  const shipping = await Shipping.findOne({ awbNumber: trimmed }).lean();
  if (!shipping) {
    return { ok: false, status: 404, message: "No shipment found for this AWB" };
  }

  const order = await Order.findById(shipping.orderId).lean();
  if (!order) {
    return { ok: false, status: 404, message: "Order not found for this AWB" };
  }

  const tracking = await Tracking.find({ shippingId: shipping._id })
    .sort({ updatedAt: 1 })
    .lean();

  const expectedDeliveryDate = orderCalculations.getExpectedDeliveryDate(
    order,
    shipping
  );

  return {
    ok: true,
    order,
    shipping,
    tracking,
    expectedDeliveryDate: expectedDeliveryDate
      ? toISTDateTime(expectedDeliveryDate)
      : null,
  };
};

const formatPublicTrackingResponse = (bundle) => {
  const { order, shipping, tracking, expectedDeliveryDate } = bundle;
  const safeShipping = { ...shipping };
  delete safeShipping.podDocument;

  return {
    success: true,
    order: formatDatesInObject(order),
    shipping: formatDatesInObject(safeShipping),
    tracking: formatDatesInObject(tracking),
    expectedDeliveryDate,
  };
};

module.exports = {
  fetchAwbTrackingBundle,
  formatPublicTrackingResponse,
};
