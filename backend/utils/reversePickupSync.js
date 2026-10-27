const Shipping = require("../models/upload/shipping.model");
const {
  syncReversePickupFromShippingDocument,
  TERMINAL_REQUEST_STATUSES,
} = require("./reversePickupStatusSync");

const syncReversePickupFromShipping = async (order, shipping) => {
  if (!order?.isReversePickup) return;

  if (shipping) {
    await syncReversePickupFromShippingDocument(shipping);
    return;
  }

  const reversePickupId = order.reversePickupId;
  if (!reversePickupId) return;
};

const enrichReversePickupRequests = async (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return requests;
  }

  const orderIds = requests
    .map((row) => row.orderId)
    .filter(Boolean);

  if (orderIds.length === 0) {
    return requests.map((row) => ({
      ...row,
      shippingStatus: "",
      pickupStatus: "",
    }));
  }

  const shippings = await Shipping.find({ orderId: { $in: orderIds } })
    .select(
      "orderId awbNumber courierName shippingStatus pickupStatus pickupDate pickupTime"
    )
    .lean();

  const shippingByOrderId = new Map(
    shippings.map((row) => [String(row.orderId), row])
  );

  return requests.map((row) => {
    const terminal = TERMINAL_REQUEST_STATUSES.includes(row.status);
    const shipping = shippingByOrderId.get(String(row.orderId));

    if (!shipping) {
      return {
        ...row,
        shippingStatus: terminal ? "" : "",
        pickupStatus: terminal ? row.syncedPickupStatus || "" : "",
      };
    }

    const awbNumber = String(shipping.awbNumber || row.awbNumber || "").trim();
    const courierName = String(shipping.courierName || row.courierName || "").trim();

    if (terminal || row.adminStatusLocked) {
      return {
        ...row,
        awbNumber,
        courierName,
        shippingStatus: "",
        pickupStatus: row.syncedPickupStatus || shipping.pickupStatus || "",
        livePickupDate: shipping.pickupDate || row.pickupDate,
        livePickupTime: shipping.pickupTime || row.pickupTime,
      };
    }

    return {
      ...row,
      awbNumber,
      courierName,
      shippingStatus: shipping.shippingStatus || "",
      pickupStatus: shipping.pickupStatus || "",
      livePickupDate: shipping.pickupDate || row.pickupDate,
      livePickupTime: shipping.pickupTime || row.pickupTime,
    };
  });
};

module.exports = {
  syncReversePickupFromShipping,
  enrichReversePickupRequests,
};
