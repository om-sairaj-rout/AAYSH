const sortNewestFirst = (a, b) =>
  new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime();

const eventRemarkText = (event) => {
  const remarks = String(event?.remarks || "").trim();
  if (remarks) return remarks;
  return String(event?.failureReason || "").trim();
};

/**
 * Latest remark per status (newest tracking entry wins for each status).
 */
export const groupRemarksByStatus = (trackingHistory = []) => {
  if (!Array.isArray(trackingHistory) || !trackingHistory.length) {
    return [];
  }

  const latestByStatus = new Map();
  const latestEventTime = new Map();

  [...trackingHistory].sort(sortNewestFirst).forEach((event) => {
    const text = eventRemarkText(event);
    if (!text || !event?.status) return;
    if (!latestByStatus.has(event.status)) {
      latestByStatus.set(event.status, text);
      latestEventTime.set(event.status, new Date(event.eventTime).getTime());
    }
  });

  return Array.from(latestByStatus.keys())
    .sort(
      (a, b) =>
        (latestEventTime.get(b) || 0) - (latestEventTime.get(a) || 0)
    )
    .map((status) => ({
      status,
      remark: latestByStatus.get(status),
    }));
};

/** Newest tracking entry for the current status that has a remark or failure reason. */
export const resolveLatestRemarkForStatus = (trackingHistory, shippingStatus) => {
  const status = String(shippingStatus || "").trim();
  if (!status || !Array.isArray(trackingHistory) || !trackingHistory.length) {
    return "";
  }

  const match = [...trackingHistory]
    .sort(sortNewestFirst)
    .find((event) => event.status === status && eventRemarkText(event));

  return match ? eventRemarkText(match) : "";
};
