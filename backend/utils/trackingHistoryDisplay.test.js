const assert = require("assert");

const dedupeConsecutiveTrackingEvents = (trackingHistory = []) => {
  const trackingEventSignature = (event = {}) => {
    const failure = event.failureReason ?? event.failure_reason ?? "";
    return [
      String(event.status || "").trim().toLowerCase(),
      String(event.location || "").trim().toLowerCase(),
      String(event.remarks || "").trim().toLowerCase(),
      String(failure || "").trim().toLowerCase(),
    ].join("\u0001");
  };

  if (!Array.isArray(trackingHistory) || trackingHistory.length < 2) {
    return Array.isArray(trackingHistory) ? [...trackingHistory] : [];
  }

  const chronological = [...trackingHistory].sort(
    (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
  );

  const kept = [];
  let prevSig = "";

  for (const event of chronological) {
    const sig = trackingEventSignature(event);
    if (kept.length > 0 && sig === prevSig) {
      continue;
    }
    kept.push(event);
    prevSig = sig;
  }

  return kept;
};

const rows = [
  {
    status: "In Transit",
    location: "DELHI",
    remarks: "OK",
    failureReason: "",
    eventTime: "2026-01-01T10:00:00+05:30",
  },
  {
    status: "In Transit",
    location: "DELHI",
    remarks: "OK",
    failure_reason: "",
    eventTime: "2026-01-01T12:00:00+05:30",
  },
  {
    status: "In Transit",
    location: "NOIDA",
    remarks: "OK",
    failureReason: "",
    eventTime: "2026-01-02T10:00:00+05:30",
  },
];

const deduped = dedupeConsecutiveTrackingEvents(rows);
assert.strictEqual(deduped.length, 2);
assert.strictEqual(deduped[1].location, "NOIDA");

console.log("trackingHistoryDisplay.test.js: all assertions passed");