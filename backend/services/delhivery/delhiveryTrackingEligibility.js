const {
  isTerminalAayshStatus,
  isDelhiveryTrackingEligibleStatus,
} = require("./delhiveryStatusMapping");

const isDelhiveryForwardCourier = (shipping) =>
  String(shipping?.courierName || "").trim() === "Delhivery";

const isValidDelhiveryManifestedAt = (value) => {
  if (value == null) return false;
  const d = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(d.getTime());
};

const isDelhiveryManifestReady = (shipping) => {
  if (!isDelhiveryForwardCourier(shipping)) return false;
  if (String(shipping?.delhiveryManifestStatus || "").trim() !== "success") {
    return false;
  }
  if (!isValidDelhiveryManifestedAt(shipping?.delhiveryManifestedAt)) {
    return false;
  }
  const awb = String(shipping?.awbNumber || "").trim();
  if (!awb) return false;
  const master = String(shipping?.delhiveryMasterAwb || "").trim();
  if (!master) return false;
  return master === awb;
};

/** Shared manifest + courier identity criteria for MongoDB find/claim filters. */
const delhiveryManifestReadyMongoFilter = {
  courierName: "Delhivery",
  delhiveryManifestStatus: "success",
  delhiveryManifestedAt: { $exists: true, $ne: null, $type: "date" },
  delhiveryMasterAwb: { $exists: true, $ne: "" },
  awbNumber: { $exists: true, $ne: "" },
  $expr: {
    $eq: [
      {
        $trim: {
          input: { $ifNull: ["$delhiveryMasterAwb", ""] },
        },
      },
      {
        $trim: {
          input: { $ifNull: ["$awbNumber", ""] },
        },
      },
    ],
  },
};

const isOrderEligibleForDelhiveryTrack = (order) => {
  if (!order) return false;
  if (order.isReversePickup) return false;
  return true;
};

const isShippingStatusPastShipped = (shipping) => {
  const status = String(shipping?.shippingStatus || "").trim();
  if (status === "Pending" || status === "Booked") return false;
  return true;
};

const shouldPollDelhiveryShipping = (shipping, order) => {
  if (!isDelhiveryForwardCourier(shipping)) return false;
  if (!isDelhiveryManifestReady(shipping)) return false;
  if (!isOrderEligibleForDelhiveryTrack(order)) return false;
  if (!isShippingStatusPastShipped(shipping)) return false;

  const status = String(shipping?.shippingStatus || "").trim();
  if (isTerminalAayshStatus(status)) return false;
  return isDelhiveryTrackingEligibleStatus(status);
};

module.exports = {
  isDelhiveryForwardCourier,
  isValidDelhiveryManifestedAt,
  isDelhiveryManifestReady,
  delhiveryManifestReadyMongoFilter,
  isOrderEligibleForDelhiveryTrack,
  isShippingStatusPastShipped,
  shouldPollDelhiveryShipping,
};