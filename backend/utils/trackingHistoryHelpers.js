const loadTrackingGroupedByShippingId = async (Tracking, shippingIds) => {
  if (!shippingIds.length) {
    return new Map();
  }

  const trackingList = await Tracking.find({
    shippingId: { $in: shippingIds },
  })
    .select("shippingId status remarks failureReason location eventTime")
    .sort({ eventTime: -1 })
    .lean();

  const map = new Map();
  trackingList.forEach((track) => {
    const key = String(track.shippingId);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(track);
  });

  return map;
};

module.exports = {
  loadTrackingGroupedByShippingId,
};
