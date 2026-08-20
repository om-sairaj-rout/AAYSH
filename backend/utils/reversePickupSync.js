const ReversePickup = require("../models/reversePickup.model");
const Shipping = require("../models/upload/shipping.model");

const syncReversePickupFromShipping = async (order, shipping) => {
  if (!order?.isReversePickup) return;

  const reversePickupId = order.reversePickupId;
  if (!reversePickupId) return;

  const update = {};

  if (shipping?.awbNumber !== undefined) {
    update.awbNumber = String(shipping.awbNumber || "").trim();
  }

  if (shipping?.courierName !== undefined) {
    update.courierName = String(shipping.courierName || "").trim();
  }

  if (Object.keys(update).length === 0) return;

  await ReversePickup.findByIdAndUpdate(reversePickupId, { $set: update });
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
    const shipping = shippingByOrderId.get(String(row.orderId));

    if (!shipping) {
      return {
        ...row,
        shippingStatus: "",
        pickupStatus: "",
      };
    }

    return {
      ...row,
      awbNumber: String(shipping.awbNumber || row.awbNumber || "").trim(),
      courierName: String(shipping.courierName || row.courierName || "").trim(),
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
