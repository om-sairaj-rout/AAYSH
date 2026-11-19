const { extractStatusFromTrackPayload } = require("./delhiveryPackageTrackApi");
const { extractStatusTypeFromTrackPayload } = require("./delhiveryCancelRemoteVerification");

const pickShipmentFromRaw = (raw) => {
  const row = Array.isArray(raw?.ShipmentData)
    ? raw.ShipmentData[0]
    : raw?.ShipmentData;
  return row?.Shipment || row || {};
};

const readWaybillFromShipment = (shipment) =>
  String(
    shipment?.AWB ||
      shipment?.Awb ||
      shipment?.waybill ||
      shipment?.Waybill ||
      ""
  ).trim();

const parseTrackEventTime = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
};

const extractScanEventTime = (scan) => {
  const candidates = [
    scan?.ScanDateTime,
    scan?.StatusDateTime,
    scan?.StatusDate,
    scan?.ScanDetail?.StatusDateTime,
    scan?.ScanDetail?.ScanDateTime,
    scan?.ScanDetail?.StatusDate,
    scan?.UpdatedAt,
    scan?.updated_at,
  ];
  for (const c of candidates) {
    const t = parseTrackEventTime(c);
    if (t) return t;
  }
  return null;
};

const extractShipmentStatusEventTime = (shipment) => {
  const status = shipment?.Status || {};
  const candidates = [
    status?.StatusDateTime,
    status?.StatusDate,
    status?.StatusLocationDateTime,
    shipment?.StatusDateTime,
    shipment?.PickUpDate,
    shipment?.pickup_date,
  ];
  for (const c of candidates) {
    const t = parseTrackEventTime(c);
    if (t) return t;
  }
  return null;
};

const collectScans = (shipment) => {
  const scans = Array.isArray(shipment?.Scans)
    ? shipment.Scans
    : Array.isArray(shipment?.scans)
      ? shipment.scans
      : [];
  return scans.filter((s) => s && typeof s === "object");
};

const readScanStatusLabel = (scan) =>
  String(
    scan?.ScanDetail?.Scan ||
      scan?.ScanDetail?.Status ||
      scan?.Scan ||
      scan?.Instructions ||
      scan?.StatusCode ||
      scan?.Remarks ||
      ""
  ).trim();

const readScanStatusType = (scan) =>
  String(
    scan?.ScanDetail?.ScanType ||
      scan?.ScanType ||
      scan?.StatusType ||
      scan?.ScanDetail?.StatusType ||
      ""
  ).trim();

const readScanLocation = (scan) =>
  String(
    scan?.ScanDetail?.ScannedLocation ||
      scan?.ScanDetail?.StatusLocation ||
      scan?.ScannedLocation ||
      scan?.StatusLocation ||
      scan?.Location ||
      ""
  ).trim();

const readScanInstructions = (scan) =>
  String(
    scan?.Instructions ||
      scan?.ScanDetail?.Instructions ||
      scan?.Remarks ||
      scan?.ScanDetail?.Remarks ||
      ""
  ).trim();

/**
 * Latest scan by parsed timestamp; falls back to last array element when times are missing.
 */
const resolveLatestScan = (shipment) => {
  const scans = collectScans(shipment);
  if (!scans.length) return null;

  let best = null;
  let bestTime = -Infinity;
  let fallback = scans[scans.length - 1];

  for (const scan of scans) {
    const t = extractScanEventTime(scan);
    if (!t) continue;
    const ms = t.getTime();
    if (ms >= bestTime) {
      bestTime = ms;
      best = scan;
    }
  }

  return best || fallback;
};

const extractNslFromScan = (scan, shipment) => {
  const chunks = [
    readScanInstructions(scan),
    readScanStatusLabel(scan),
    scan?.StatusCode,
    shipment?.NSLCode,
    shipment?.nsl_code,
    shipment?.Status?.StatusCode,
  ]
    .filter(Boolean)
    .join(" ");
  const match = chunks.match(/EOD-\d+/i);
  return match ? String(match[0]).toUpperCase() : "";
};

const buildLatestTrackingSnapshot = (raw) => {
  if (!raw) {
    return { ok: false, message: "Empty Delhivery tracking payload." };
  }

  const shipment = pickShipmentFromRaw(raw);
  const waybill = readWaybillFromShipment(shipment);
  const latestScan = resolveLatestScan(shipment);
  const shipmentStatus = extractStatusFromTrackPayload(raw);
  const shipmentStatusType = extractStatusTypeFromTrackPayload(raw);
  const shipmentStatusTime = extractShipmentStatusEventTime(shipment);

  let status = shipmentStatus;
  let statusType = shipmentStatusType;
  let eventTime = shipmentStatusTime || new Date(0);
  let location = String(shipment?.Status?.StatusLocation || "").trim();
  let remark = String(
    shipment?.Status?.Instructions || shipment?.Instructions || ""
  ).trim();
  let nslCode = "";
  let source = "shipment_status";

  if (latestScan) {
    const scanTime = extractScanEventTime(latestScan) || new Date(0);
    const scanStatus = readScanStatusLabel(latestScan);
    const scanType = readScanStatusType(latestScan);

    if (scanTime.getTime() >= eventTime.getTime()) {
      if (scanStatus) status = scanStatus;
      if (scanType) statusType = scanType;
      eventTime = scanTime;
      location = readScanLocation(latestScan) || location;
      remark = readScanInstructions(latestScan) || remark;
      source = "latest_scan";
    }

    nslCode = extractNslFromScan(latestScan, shipment);
  }

  if (!nslCode && shipment) {
    const blob = [
      shipment?.NSLCode,
      shipment?.Status?.StatusCode,
      remark,
    ]
      .filter(Boolean)
      .join(" ");
    const match = blob.match(/EOD-\d+/i);
    if (match) nslCode = String(match[0]).toUpperCase();
  }

  return {
    ok: true,
    waybill,
    shipment,
    latestScan,
    status: String(status || "").trim(),
    statusType: String(statusType || "").trim().toUpperCase(),
    eventTime: eventTime.getTime() > 0 ? eventTime : null,
    location,
    remark,
    nslCode,
    source,
    shipmentStatus,
    shipmentStatusType,
  };
};

/**
 * Parse multi-waybill packages/json response into a Map(waybill -> per-shipment raw slice).
 */
const parseBulkTrackResponse = (data) => {
  const map = new Map();
  if (!data) return map;

  const rows = Array.isArray(data.ShipmentData)
    ? data.ShipmentData
    : data.ShipmentData
      ? [data.ShipmentData]
      : [];

  for (const row of rows) {
    const shipment = row?.Shipment || row || {};
    const wb = readWaybillFromShipment(shipment);
    if (!wb) continue;
    map.set(wb, {
      raw: { ShipmentData: [row] },
      waybill: wb,
    });
  }
  return map;
};

const buildScanSyncKey = ({
  waybill,
  eventTime,
  statusType,
  status,
  nslCode,
  location,
}) => {
  const t = eventTime instanceof Date ? eventTime.toISOString() : "";
  return [
    String(waybill || "").trim(),
    t,
    String(statusType || "").toUpperCase(),
    String(status || "").trim().toLowerCase(),
    String(nslCode || "").toUpperCase(),
    String(location || "").trim().toLowerCase(),
  ].join("|");
};

module.exports = {
  pickShipmentFromRaw,
  readWaybillFromShipment,
  resolveLatestScan,
  buildLatestTrackingSnapshot,
  parseBulkTrackResponse,
  buildScanSyncKey,
  extractScanEventTime,
};