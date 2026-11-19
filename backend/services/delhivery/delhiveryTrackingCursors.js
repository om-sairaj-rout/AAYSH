const isOlderScanForWaybill = (cursor, eventTime, syncKey) => {
  const lastAt = cursor?.lastSyncedScanAt
    ? new Date(cursor.lastSyncedScanAt).getTime()
    : 0;
  const lastKey = String(cursor?.lastSyncedScanKey || "");
  const key = String(syncKey || "").trim();
  const ms = eventTime ? eventTime.getTime() : 0;

  if (ms && lastAt && ms < lastAt) return true;
  if (ms && lastAt && ms === lastAt && key && lastKey === key) return true;
  if (!ms && key && lastKey && lastKey === key) return true;
  return false;
};

const getWaybillCursor = (shipping, waybill) => {
  const wb = String(waybill || "").trim();
  const rows = shipping?.delhiveryPackageTrackCursors || [];
  const hit = rows.find((r) => String(r.waybill || "").trim() === wb);
  if (hit) return hit;

  if (rows.length === 0) {
    const legacyCandidates = [
      String(shipping?.awbNumber || "").trim(),
      String(shipping?.delhiveryMasterAwb || "").trim(),
    ].filter(Boolean);
    if (legacyCandidates.includes(wb)) {
      return {
        waybill: wb,
        lastSyncedScanAt: shipping?.delhiveryLastSyncedScanAt || null,
        lastSyncedScanKey: String(shipping?.delhiveryLastSyncedScanKey || ""),
      };
    }
  }

  return { waybill: wb, lastSyncedScanAt: null, lastSyncedScanKey: "" };
};

const setWaybillCursor = (shipping, waybill, eventTime, syncKey) => {
  const wb = String(waybill || "").trim();
  if (!shipping.delhiveryPackageTrackCursors) {
    shipping.delhiveryPackageTrackCursors = [];
  }

  let row = shipping.delhiveryPackageTrackCursors.find(
    (r) => String(r.waybill || "").trim() === wb
  );
  if (!row) {
    row = { waybill: wb, lastSyncedScanAt: null, lastSyncedScanKey: "" };
    shipping.delhiveryPackageTrackCursors.push(row);
  }

  row.lastSyncedScanAt = eventTime;
  row.lastSyncedScanKey = syncKey;

  const primary = String(shipping.awbNumber || "").trim();
  if (wb === primary || shipping.delhiveryPackageTrackCursors.length === 1) {
    shipping.delhiveryLastSyncedScanAt = eventTime;
    shipping.delhiveryLastSyncedScanKey = syncKey;
  }
};

const partitionPackageScansForSync = (shipping, packageStatuses, buildKey) => {
  const newScans = [];

  for (const pkg of packageStatuses || []) {
    if (!pkg?.snapshot?.ok) {
      pkg.hasNewScan = false;
      continue;
    }

    const eventTime = pkg.snapshot.eventTime || null;
    const syncKey = buildKey({
      waybill: pkg.waybill || pkg.snapshot.waybill,
      eventTime: eventTime || new Date(0),
      statusType: pkg.snapshot.statusType,
      status: pkg.snapshot.status,
      nslCode: pkg.snapshot.nslCode,
      location: pkg.snapshot.location,
    });

    const cursor = getWaybillCursor(shipping, pkg.waybill || pkg.snapshot.waybill);
    const older = isOlderScanForWaybill(cursor, eventTime, syncKey);
    pkg.hasNewScan = !older;
    pkg.syncKey = syncKey;

    if (!older) {
      newScans.push(pkg);
    }
  }

  return { newScans, packageStatuses: packageStatuses || [] };
};

module.exports = {
  isOlderScanForWaybill,
  getWaybillCursor,
  setWaybillCursor,
  partitionPackageScansForSync,
};