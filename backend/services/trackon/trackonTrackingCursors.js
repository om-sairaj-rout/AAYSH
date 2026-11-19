const isOlderTrackonEvent = (cursor, eventAt, syncKey) => {
  const lastAt = cursor?.lastSyncedScanAt
    ? new Date(cursor.lastSyncedScanAt).getTime()
    : 0;
  const lastKey = String(cursor?.lastSyncedScanKey || "");
  const key = String(syncKey || "").trim();
  const ms = eventAt ? eventAt.getTime() : 0;

  if (ms && lastAt && ms < lastAt) return true;
  if (ms && lastAt && ms === lastAt && key && lastKey === key) return true;
  if (!ms && key && lastKey && lastKey === key) return true;
  return false;
};

const getTrackonCursor = (shipping, awb) => {
  const wb = String(awb || shipping?.awbNumber || "").trim();
  const rows = shipping?.trackonPackageTrackCursors || [];
  const hit = rows.find((r) => String(r.waybill || "").trim() === wb);
  if (hit) return hit;

  if (
    rows.length === 0 &&
    String(shipping?.awbNumber || "").trim() === wb
  ) {
    return {
      waybill: wb,
      lastSyncedScanAt: shipping?.trackonLastSyncedEventAt || null,
      lastSyncedScanKey: String(shipping?.trackonLastSyncedEventKey || ""),
    };
  }

  return { waybill: wb, lastSyncedScanAt: null, lastSyncedScanKey: "" };
};

const setTrackonCursor = (shipping, awb, eventAt, syncKey) => {
  const wb = String(awb || "").trim();
  if (!shipping.trackonPackageTrackCursors) {
    shipping.trackonPackageTrackCursors = [];
  }

  let row = shipping.trackonPackageTrackCursors.find(
    (r) => String(r.waybill || "").trim() === wb
  );
  if (!row) {
    row = { waybill: wb, lastSyncedScanAt: null, lastSyncedScanKey: "" };
    shipping.trackonPackageTrackCursors.push(row);
  }

  row.lastSyncedScanAt = eventAt;
  row.lastSyncedScanKey = syncKey;

  const primary = String(shipping.awbNumber || "").trim();
  if (wb === primary || shipping.trackonPackageTrackCursors.length === 1) {
    shipping.trackonLastSyncedEventAt = eventAt;
    shipping.trackonLastSyncedEventKey = syncKey;
  }
};

const partitionTrackonEventsForSync = (shipping, events, awb, buildKey) => {
  const newEvents = [];
  const wb = String(awb || shipping?.awbNumber || "").trim();

  for (const ev of events || []) {
    const eventAt = ev.eventAt || null;
    const syncKey = buildKey({
      awb: wb,
      trackingCode: ev.trackingCode,
      eventAt: eventAt || null,
      currentStatus: ev.currentStatus,
      city: ev.city,
      remarks: ev.remarks,
    });

    const cursor = getTrackonCursor(shipping, wb);
    const older = isOlderTrackonEvent(cursor, eventAt, syncKey);
    ev.hasNewEvent = !older;
    ev.syncKey = syncKey;

    if (!older) {
      newEvents.push(ev);
    }
  }

  newEvents.sort((a, b) => {
    const ta = a.eventAt ? a.eventAt.getTime() : 0;
    const tb = b.eventAt ? b.eventAt.getTime() : 0;
    return ta - tb;
  });

  return { newEvents };
};

module.exports = {
  isOlderTrackonEvent,
  getTrackonCursor,
  setTrackonCursor,
  partitionTrackonEventsForSync,
};