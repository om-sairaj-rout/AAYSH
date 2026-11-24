const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Tracking = require("../models/upload/tracking.model");
const orderCalculations = require("./orderCalculations");
const { toISTDateTime, formatDatesInObject } = require("./dateTime");
const {
  fetchTrackonPublicTrackingBundle,
} = require("./trackonPublicTracking");
const {
  pickPublicOrder,
  pickPublicShipping,
  pickPublicTrackingEvents,
} = require("./publicTrackingResponseSanitize");

const fetchAwbTrackingBundle = async (awbNumber, options = {}) => {
  const { allowTrackonFallback = true } = options;
  const trimmed = String(awbNumber || "").trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: "AWB number is required" };
  }

  const shipping = await Shipping.findOne({ awbNumber: trimmed }).lean();
  if (!shipping) {
    if (!allowTrackonFallback) {
      return { ok: false, status: 404, message: "No shipment found for this AWB" };
    }
    const trackonBundle = await fetchTrackonPublicTrackingBundle(trimmed);
    if (trackonBundle.ok) {
      return trackonBundle;
    }
    if (trackonBundle.status === 503) {
      return trackonBundle;
    }
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

/** Public / unauthenticated consumers (website, AiSensy) — allowlisted fields only. */
const formatPublicTrackingResponse = (bundle) => ({
  success: true,
  trackonOnly: Boolean(bundle.trackonOnly),
  order: pickPublicOrder(bundle),
  shipping: pickPublicShipping(bundle.shipping || {}),
  tracking: pickPublicTrackingEvents(bundle.tracking || []),
  expectedDeliveryDate: bundle.expectedDeliveryDate ?? null,
});

/** Authenticated company-scoped tracking — full order/shipping (POD stripped). */
const formatSecureTrackingResponse = (bundle) => {
  const { order, shipping, tracking, expectedDeliveryDate } = bundle;
  const safeShipping = { ...shipping };
  delete safeShipping.podDocument;

  return {
    success: true,
    trackonOnly: Boolean(bundle.trackonOnly),
    order: formatDatesInObject(bundle.order || order),
    shipping: formatDatesInObject(bundle.shipping || safeShipping),
    tracking: formatDatesInObject(bundle.tracking || tracking),
    expectedDeliveryDate: bundle.expectedDeliveryDate ?? expectedDeliveryDate,
  };
};

module.exports = {
  fetchAwbTrackingBundle,
  formatPublicTrackingResponse,
  formatSecureTrackingResponse,
};