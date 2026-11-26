/**
 * Normalize public/secure AWB tracking API payloads for AwbTrackingDetails.
 */
export const mapAwbTrackingOrder = (res) => {
  const shipping = res?.shipping || {};
  const order = res?.order || {};
  const status = String(shipping.shippingStatus || order.courierStatus || "").trim();

  const deliveryDate =
    order.deliveryDate ||
    shipping.deliveredAt ||
    (status.toLowerCase() === "delivered" ? shipping.deliveredAt : null) ||
    null;

  const rawTracking = res?.tracking || shipping.trackingHistory || [];
  const trackingHistory = rawTracking.map((row) => ({
    ...row,
    failureReason: row.failureReason ?? row.failure_reason ?? "",
  }));

  return {
    ...order,
    deliveryDate,
    trackonOnly: Boolean(res?.trackonOnly),
    expectedDeliveryDate: res?.expectedDeliveryDate ?? null,
    shipping: {
      ...shipping,
      trackingHistory,
    },
  };
};