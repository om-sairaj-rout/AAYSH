import { formatDisplayDate } from "./dateTime";

const trackingEventSignature = (event = {}) => {
  const failure = event.failureReason ?? event.failure_reason ?? "";
  return [
    String(event.status || "").trim().toLowerCase(),
    String(event.location || "").trim().toLowerCase(),
    String(event.remarks || "").trim().toLowerCase(),
    String(failure || "").trim().toLowerCase(),
  ].join("\u0001");
};

/**
 * Remove consecutive duplicates (by status, location, remarks, failure reason).
 * Does not mutate the source array. Timestamp differences are ignored for dupes.
 */
export const dedupeConsecutiveTrackingEvents = (trackingHistory = []) => {
  if (!Array.isArray(trackingHistory) || trackingHistory.length < 2) {
    return Array.isArray(trackingHistory) ? [...trackingHistory] : [];
  }

  const chronological = [...trackingHistory].sort(
    (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
  );

  const kept = [];
  let prevSig = "";

  for (const event of chronological) {
    const sig = trackingEventSignature(event);
    if (kept.length > 0 && sig === prevSig) {
      continue;
    }
    kept.push(event);
    prevSig = sig;
  }

  return kept;
};

export const getTrackingDeliveryDisplay = (order = {}) => {
  const shipping = order.shipping || {};
  const status = String(
    shipping.shippingStatus || order.courierStatus || ""
  )
    .trim()
    .toLowerCase();

  if (status === "delivered") {
    const deliveryDate =
      order.deliveryDate || shipping.deliveredAt || null;
    return {
      label: "Delivered On",
      value: deliveryDate
        ? formatDisplayDate(deliveryDate)
        : "Not available",
    };
  }

  return {
    label: "Expected Delivery",
    value: order.expectedDeliveryDate
      ? formatDisplayDate(order.expectedDeliveryDate)
      : "Not available",
  };
};