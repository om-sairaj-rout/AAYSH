const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const REQUEST_STATUSES = ["pending", "approved", "rejected", "awb_assigned", "failed"];

const parsePickupLocation = (location) => {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 4) {
    const pincode = parts[parts.length - 1];
    const state = parts[parts.length - 2];
    const city = parts[parts.length - 3];
    const address = parts.slice(0, -3).join(", ");
    return { address, city, state, pincode };
  }

  if (parts.length === 3) {
    return {
      address: parts[0],
      city: parts[1],
      state: parts[2],
      pincode: "",
    };
  }

  return {
    address: parts.join(", "),
    city: "",
    state: "",
    pincode: "",
  };
};

const buildReversePickupSearchFilter = async (search, Shipping) => {
  const trimmed = String(search || "").trim();
  if (!trimmed) return null;

  const searchRegex = { $regex: escapeRegex(trimmed), $options: "i" };
  const orConditions = [
    { requestId: searchRegex },
    { externalOrderId: searchRegex },
    { originalAwbNumber: searchRegex },
    { awbNumber: searchRegex },
  ];

  const normalized = trimmed.toLowerCase().replace(/\s+/g, "_");
  const matchedRequestStatus = REQUEST_STATUSES.find(
    (status) =>
      status === normalized ||
      status.replace(/_/g, " ") === trimmed.toLowerCase()
  );

  if (matchedRequestStatus) {
    orConditions.push({ status: matchedRequestStatus });
  } else {
    orConditions.push({ status: searchRegex });
  }

  const shippingRows = await Shipping.find({
    $or: [
      { awbNumber: searchRegex },
      { shippingStatus: searchRegex },
      { pickupStatus: searchRegex },
      { courierName: searchRegex },
    ],
  })
    .select("orderId")
    .limit(250)
    .lean();

  const orderIds = [
    ...new Set(
      shippingRows.map((row) => row.orderId).filter(Boolean).map(String)
    ),
  ];

  if (orderIds.length) {
    orConditions.push({ orderId: { $in: orderIds } });
  }

  return { $or: orConditions };
};

module.exports = {
  escapeRegex,
  parsePickupLocation,
  buildReversePickupSearchFilter,
};
