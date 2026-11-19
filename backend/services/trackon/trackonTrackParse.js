const IST_OFFSET = "+05:30";

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Parse Trackon EVENTDATE (DD/MM/YYYY) + EVENTTIME (HH:MM) in IST.
 */
const parseTrackonEventDateTime = (eventDate, eventTime) => {
  const d = String(eventDate || "").trim();
  const t = String(eventTime || "").trim();
  if (!d) return null;

  const dateMatch = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dateMatch) return null;

  const day = pad2(Number(dateMatch[1]));
  const month = pad2(Number(dateMatch[2]));
  const year = dateMatch[3];

  let hour = "00";
  let minute = "00";
  if (t) {
    const timeMatch = t.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hour = pad2(Number(timeMatch[1]));
      minute = pad2(Number(timeMatch[2]));
    }
  }

  const iso = `${year}-${month}-${day}T${hour}:${minute}:00${IST_OFFSET}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const readRowString = (row, keys) => {
  for (const key of keys) {
    const v = row?.[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const isPlainObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

const hasSummaryData = (row) =>
  isPlainObject(row) && Object.keys(row).length > 0;

/**
 * Prefer summaryTrack when present; otherwise CustomerSummaryTrack variants.
 */
const resolveTrackonSummary = (raw) => {
  const primary =
    raw?.summaryTrack ?? raw?.SummaryTrack ?? raw?.summary_track;
  if (hasSummaryData(primary)) {
    return { summary: primary, summarySource: "summaryTrack" };
  }

  const customer =
    raw?.CustomersummaryTrack ??
    raw?.CustomerSummaryTrack ??
    raw?.customersummaryTrack ??
    raw?.customer_summary_track;
  if (hasSummaryData(customer)) {
    return { summary: customer, summarySource: "CustomersummaryTrack" };
  }

  return { summary: {}, summarySource: null };
};

const normalizeTrackingRow = (row, source) => {
  const trackingCode = readRowString(row, [
    "TRACKING_CODE",
    "TrackingCode",
    "tracking_code",
  ]).toUpperCase();
  const currentStatus = readRowString(row, [
    "CURRENT_STATUS",
    "CurrentStatus",
    "current_status",
  ]);
  const city = readRowString(row, ["CURRENT_CITY", "CurrentCity", "current_city"]);
  const eventDate = readRowString(row, ["EVENTDATE", "EventDate", "eventdate"]);
  const eventTime = readRowString(row, ["EVENTTIME", "EventTime", "eventtime"]);
  const ndrReason = readRowString(row, ["NDR_REASON", "NdrReason", "ndr_reason"]);

  const eventAt = parseTrackonEventDateTime(eventDate, eventTime);

  return {
    trackingCode,
    currentStatus,
    city,
    eventDate,
    eventTime,
    eventAt,
    ndrReason,
    source,
    remarks: [currentStatus, ndrReason].filter(Boolean).join(" — ").trim(),
  };
};

const parseTrackonTrackingPayload = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "Empty Trackon tracking payload." };
  }

  const { summary, summarySource } = resolveTrackonSummary(raw);
  const details = raw.lstDetails || raw.LstDetails || raw.lst_details || [];
  const list = Array.isArray(details) ? details : details ? [details] : [];

  const awb =
    readRowString(summary, ["AWBNO", "AwbNo", "awbno"]) ||
    readRowString(list[0] || {}, ["AWBNO", "AwbNo"]) ||
    "";

  const events = [];

  if (hasSummaryData(summary)) {
    events.push(
      normalizeTrackingRow(summary, summarySource || "summaryTrack")
    );
  }

  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    events.push(normalizeTrackingRow(row, "lstDetails"));
  }

  const seen = new Set();
  const unique = [];
  for (const ev of events) {
    if (!ev.trackingCode && !ev.currentStatus) continue;
    const key = buildTrackonEventSyncKey({ awb, ...ev });
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ev);
  }

  unique.sort((a, b) => {
    const ta = a.eventAt ? a.eventAt.getTime() : 0;
    const tb = b.eventAt ? b.eventAt.getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.trackingCode).localeCompare(String(b.trackingCode));
  });

  return {
    ok: true,
    awb,
    summary,
    summarySource,
    events: unique,
  };
};

const buildTrackonEventSyncKey = ({
  awb,
  trackingCode,
  eventAt,
  currentStatus,
  city,
  remarks,
}) => {
  const t = eventAt instanceof Date ? eventAt.toISOString() : "";
  return [
    String(awb || "").trim(),
    String(trackingCode || "").toUpperCase(),
    t,
    String(currentStatus || "").trim().toLowerCase(),
    String(city || "").trim().toLowerCase(),
    String(remarks || "").trim().toLowerCase(),
  ].join("|");
};

module.exports = {
  parseTrackonEventDateTime,
  parseTrackonTrackingPayload,
  buildTrackonEventSyncKey,
  normalizeTrackingRow,
  resolveTrackonSummary,
  hasSummaryData,
};