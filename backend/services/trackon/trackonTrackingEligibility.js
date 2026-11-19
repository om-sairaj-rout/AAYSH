const {
  isTerminalAayshStatus,
} = require("./trackonStatusMapping");

const TRACKON_COURIER_NAME = "Trackon";

const TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES = [
  "Pending",
  "Booked",
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
];

const isTrackonForwardCourier = (shipping) =>
  String(shipping?.courierName || "").trim() === TRACKON_COURIER_NAME;

const isTrackonAwbReady = (shipping) =>
  Boolean(String(shipping?.awbNumber || "").trim());

const isOrderEligibleForTrackonTrack = (order) => {
  if (!order) return false;
  if (order.isReversePickup) return false;
  return true;
};

/** Tracking starts only after Admin Pickup / workflow marks Shipped (not Pending/Booked). */
const isShippingStatusPastShipped = (shipping) => {
  const status = String(shipping?.shippingStatus || "").trim();
  if (status === "Pending" || status === "Booked") return false;
  return true;
};

const isTrackonTrackingEligibleStatus = (status) => {
  const key = String(status || "").trim();
  if (key === "Pending" || key === "Booked") return false;
  if (isTerminalAayshStatus(key)) return false;
  return true;
};

const isTrackonManifestReady = (shipping) =>
  isTrackonForwardCourier(shipping) && isTrackonAwbReady(shipping);

const trackonEligibleMongoFilter = {
  courierName: TRACKON_COURIER_NAME,
  awbNumber: { $exists: true, $ne: "" },
};

const shouldPollTrackonShipping = (shipping, order) => {
  if (!isTrackonManifestReady(shipping)) return false;
  if (!isOrderEligibleForTrackonTrack(order)) return false;
  if (!isShippingStatusPastShipped(shipping)) return false;

  const status = String(shipping?.shippingStatus || "").trim();
  if (isTerminalAayshStatus(status)) return false;
  return isTrackonTrackingEligibleStatus(status);
};

module.exports = {
  TRACKON_COURIER_NAME,
  TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES,
  isTrackonForwardCourier,
  isTrackonAwbReady,
  isTrackonManifestReady,
  trackonEligibleMongoFilter,
  isOrderEligibleForTrackonTrack,
  isShippingStatusPastShipped,
  isTrackonTrackingEligibleStatus,
  shouldPollTrackonShipping,
};