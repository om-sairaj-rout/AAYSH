const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "awb_assigned",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
];

const looksLikeAwbSearch = (text) => /^[A-Za-z0-9-]{6,}$/.test(text);

const buildReversePickupSearchFilter = async (search, Shipping) => {
  const trimmed = String(search || "").trim();
  if (!trimmed) return null;

  const searchRegex = { $regex: escapeRegex(trimmed), $options: "i" };
  const orConditions = [
    { requestId: searchRegex },
    { externalOrderId: searchRegex },
    { originalAwbNumber: searchRegex },
    { awbNumber: searchRegex },
    { fromName: searchRegex },
    { fromPhone: searchRegex },
    { toName: searchRegex },
    { toPhone: searchRegex },
  ];

  const normalized = trimmed.toLowerCase().replace(/\s+/g, "_");
  const matchedRequestStatus = REQUEST_STATUSES.find(
    (status) =>
      status === normalized ||
      status.replace(/_/g, " ") === trimmed.toLowerCase()
  );

  if (matchedRequestStatus) {
    orConditions.push({ status: matchedRequestStatus });
  }

  if (looksLikeAwbSearch(trimmed)) {
    const shippingRows = await Shipping.find({
      awbNumber: searchRegex,
    })
      .select("orderId")
      .limit(100)
      .lean();

    const orderIds = [
      ...new Set(
        shippingRows.map((row) => row.orderId).filter(Boolean).map(String)
      ),
    ];

    if (orderIds.length) {
      orConditions.push({ orderId: { $in: orderIds } });
    }
  }

  return { $or: orConditions };
};

module.exports = {
  escapeRegex,
  buildReversePickupSearchFilter,
};
