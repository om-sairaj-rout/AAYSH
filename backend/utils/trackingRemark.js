const sortNewestFirst = (a, b) =>
  new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime();

const eventRemarkText = (event) => {
  const remarks = String(event?.remarks || "").trim();
  if (remarks) return remarks;
  return String(event?.failureReason || "").trim();
};

/** Newest tracking entry for the current status that has a remark or failure reason. */
const resolveLatestRemarkForStatus = (trackingHistory, shippingStatus) => {
  const status = String(shippingStatus || "").trim();
  if (!status || !Array.isArray(trackingHistory) || !trackingHistory.length) {
    return "";
  }

  const match = [...trackingHistory]
    .sort(sortNewestFirst)
    .find((event) => event.status === status && eventRemarkText(event));

  return match ? eventRemarkText(match) : "";
};

module.exports = {
  resolveLatestRemarkForStatus,
};
