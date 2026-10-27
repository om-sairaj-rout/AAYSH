const ReversePickup = require("../models/reversePickup.model");

const TERMINAL_REQUEST_STATUSES = ["failed", "rejected", "delivered"];

const SHIPPING_STATUS_RANK = {
  Pending: 0,
  Booked: 10,
  Shipped: 20,
  "In Transit": 30,
  "Out For Delivery": 35,
  Delivered: 40,
  Delayed: 25,
  Undelivered: 25,
  RTO: 30,
  Returned: 30,
  Cancelled: 5,
};

const mapShippingToReverseStatus = (shipping) => {
  const shippingStatus = String(shipping?.shippingStatus || "").trim();
  const pickupStatus = String(shipping?.pickupStatus || "").trim();

  if (shippingStatus === "Delivered") return "delivered";
  if (shippingStatus === "Cancelled") return null;
  if (["In Transit", "Out For Delivery", "Shipped", "RTO", "Returned"].includes(shippingStatus)) {
    return "in_transit";
  }
  if (pickupStatus === "Picked Up" || pickupStatus === "Completed") {
    return "picked_up";
  }
  if (pickupStatus === "Scheduled" || shippingStatus === "Booked") {
    return "pickup_scheduled";
  }
  if (pickupStatus === "Failed") {
    return null;
  }
  return null;
};

const isStatusLocked = (reversePickup) =>
  Boolean(reversePickup?.adminStatusLocked) ||
  TERMINAL_REQUEST_STATUSES.includes(String(reversePickup?.status || "").trim());

const shouldApplyStatusUpdate = (reversePickup, nextStatus) => {
  if (!nextStatus) return false;
  if (isStatusLocked(reversePickup)) return false;
  return true;
};

const syncReversePickupFromShippingDocument = async (shipping, eventTime = new Date()) => {
  if (!shipping?.orderId) return;

  const reversePickup = await ReversePickup.findOne({
    orderId: shipping.orderId,
  });

  if (!reversePickup) return;

  const awbCourierUpdate = {
    awbNumber: String(shipping.awbNumber || reversePickup.awbNumber || "").trim(),
    courierName: String(shipping.courierName || reversePickup.courierName || "").trim(),
    syncedShippingStatus: shipping.shippingStatus || "",
    syncedPickupStatus: shipping.pickupStatus || "",
    lastShipmentSyncAt: eventTime,
  };

  if (isStatusLocked(reversePickup)) {
    await ReversePickup.updateOne(
      { _id: reversePickup._id },
      { $set: awbCourierUpdate }
    );
    return;
  }

  const nextStatus = mapShippingToReverseStatus(shipping);
  if (!shouldApplyStatusUpdate(reversePickup, nextStatus)) {
    await ReversePickup.updateOne(
      { _id: reversePickup._id },
      { $set: awbCourierUpdate }
    );
    return;
  }

  const lastRank = SHIPPING_STATUS_RANK[reversePickup.syncedShippingStatus] || 0;
  const newRank = SHIPPING_STATUS_RANK[shipping.shippingStatus] || 0;
  if (newRank < lastRank && reversePickup.syncedShippingStatus) {
    return;
  }

  await ReversePickup.updateOne(
    { _id: reversePickup._id },
    {
      $set: {
        ...awbCourierUpdate,
        status: nextStatus,
      },
    }
  );
};

module.exports = {
  mapShippingToReverseStatus,
  isStatusLocked,
  syncReversePickupFromShippingDocument,
  TERMINAL_REQUEST_STATUSES,
};
