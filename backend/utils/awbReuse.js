const Awb = require("../models/awb/awb.model");

const NON_REUSABLE_AFTER_STATUSES = [
  "In Transit",
  "Out For Delivery",
  "Delivered",
  "RTO",
  "Returned",
  "Exchange",
];

const reachedInTransit = (shippingStatus) =>
  NON_REUSABLE_AFTER_STATUSES.includes(String(shippingStatus || "").trim());

const canReuseAwbAfterCancellation = (shippingStatus) =>
  !reachedInTransit(shippingStatus);

const releaseAwbIfReusable = async (awbNumber, shippingStatusBeforeCancel) => {
  const trimmed = String(awbNumber || "").trim();
  if (!trimmed) return { reused: false };

  if (!canReuseAwbAfterCancellation(shippingStatusBeforeCancel)) {
    return { reused: false };
  }

  await Awb.findOneAndUpdate(
    { awbNumber: trimmed },
    {
      $set: {
        status: "available",
        assignedOrder: null,
      },
    }
  );

  return { reused: true };
};

module.exports = {
  reachedInTransit,
  canReuseAwbAfterCancellation,
  releaseAwbIfReusable,
};
