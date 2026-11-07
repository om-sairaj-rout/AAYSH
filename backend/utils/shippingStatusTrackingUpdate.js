const Tracking = require("../models/upload/tracking.model");
const notifyShippingStatusWhatsApp = require("./notifyShippingStatusWhatsApp");
const {
  startDeliveryAttempt,
  failCurrentDeliveryAttempt,
  completeCurrentDeliveryAttempt,
} = require("./deliveryAttemptService");
const {
  syncReversePickupFromShippingDocument,
} = require("./reversePickupStatusSync");

const applyShippingStatusTimestamps = (shipping, status, eventTime = new Date()) => {
  switch (status) {
    case "Booked":
      if (!shipping.bookedAt) shipping.bookedAt = eventTime;
      break;
    case "Shipped":
      if (!shipping.shippedAt) shipping.shippedAt = eventTime;
      break;
    case "In Transit":
      shipping.inTransitAt = eventTime;
      break;
    case "Out For Delivery":
      if (!shipping.outForDeliveryAt) shipping.outForDeliveryAt = eventTime;
      startDeliveryAttempt(shipping, eventTime);
      break;
    case "Delivered":
      if (!shipping.deliveredAt) shipping.deliveredAt = eventTime;
      completeCurrentDeliveryAttempt(shipping, eventTime);
      break;
    case "Undelivered":
      break;
    case "Cancelled":
      shipping.cancelledAt = eventTime;
      break;
    case "RTO":
      shipping.rtoAt = eventTime;
      break;
    case "Returned":
      shipping.returnedAt = eventTime;
      break;
    case "Exchange":
      shipping.exchangeAt = eventTime;
      break;
    case "Delayed":
      shipping.delayedAt = eventTime;
      break;
    default:
      break;
  }
};

/**
 * Persist tracking + status side effects. Skips status transitions when unchanged.
 */
const applyShippingStatusWithTracking = async ({
  shipping,
  order,
  status,
  remarks = "",
  failureReason = "",
  location = "",
  updatedBy = null,
  eventTime = new Date(),
  skipIfUnchanged = true,
}) => {
  const trimmedStatus = String(status || "").trim();
  const trimmedRemarks = String(remarks || "").trim();
  const trimmedLocation = String(location || "").trim();
  const trimmedFailureReason = String(failureReason || "").trim();

  const previousStatus = shipping.shippingStatus;

  if (
    skipIfUnchanged &&
    previousStatus === trimmedStatus &&
    !trimmedRemarks &&
    !trimmedFailureReason &&
    !trimmedLocation
  ) {
    return { changed: false, previousStatus, trackingCreated: false };
  }

  const statusChanged = previousStatus !== trimmedStatus;

  if (statusChanged) {
    shipping.shippingStatus = trimmedStatus;
    applyShippingStatusTimestamps(shipping, trimmedStatus, eventTime);

    if (trimmedStatus === "Undelivered") {
      failCurrentDeliveryAttempt(
        shipping,
        trimmedFailureReason || trimmedRemarks,
        eventTime
      );
    }
  }

  const lastTracking = await Tracking.findOne({
    shippingId: shipping._id,
  })
    .select("status location remarks failureReason eventTime")
    .sort({ eventTime: -1 })
    .lean();

  const isDuplicate =
    lastTracking &&
    lastTracking.status === trimmedStatus &&
    lastTracking.location === trimmedLocation &&
    lastTracking.remarks === trimmedRemarks &&
    lastTracking.failureReason === trimmedFailureReason;

  let trackingCreated = false;
  if (!isDuplicate) {
    await Tracking.create({
      shippingId: shipping._id,
      status: trimmedStatus,
      location: trimmedLocation,
      remarks: trimmedRemarks,
      failureReason: trimmedFailureReason,
      eventTime,
      updatedBy,
    });
    trackingCreated = true;
  }

  if (order && statusChanged) {
    order.courierStatus = trimmedStatus;
    if (trimmedStatus === "Delivered") {
      order.deliveryDate = shipping.deliveredAt || eventTime;
    }
  }

  if (statusChanged || trackingCreated) {
    await shipping.save();
    if (order && statusChanged) {
      await order.save();
    }
    if (statusChanged) {
      await syncReversePickupFromShippingDocument(shipping, eventTime);
      notifyShippingStatusWhatsApp({
        shipping,
        previousStatus,
        newStatus: trimmedStatus,
      }).catch((err) => {
        console.error("WhatsApp notification failed:", err.message);
      });
    }
  }

  return { changed: statusChanged || trackingCreated, previousStatus, trackingCreated };
};

module.exports = {
  applyShippingStatusTimestamps,
  applyShippingStatusWithTracking,
};
