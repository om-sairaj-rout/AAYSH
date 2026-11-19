const crypto = require("crypto");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const DelhiveryShipmentManifest = require("../../models/delhiveryShipmentManifest.model");
const { applyShippingStatusWithTracking } = require("../../utils/shippingStatusTrackingUpdate");
const { collectOrderDelhiveryWaybills } = require("./delhiveryDocument.service");
const { fetchDelhiveryPackagesTrackBulk } = require("./delhiveryPackageTrackApi");
const {
  buildLatestTrackingSnapshot,
  parseBulkTrackResponse,
  buildScanSyncKey,
} = require("./delhiveryTrackParse");
const { resolveAayshStatusFromSnapshot } = require("./delhiveryStatusMapping");
const { aggregateMpsPackageStatuses } = require("./delhiveryMpsStatusAggregate");
const {
  shouldPollDelhiveryShipping,
  delhiveryManifestReadyMongoFilter,
} = require("./delhiveryTrackingEligibility");
const {
  setWaybillCursor,
  partitionPackageScansForSync,
  isOlderScanForWaybill,
} = require("./delhiveryTrackingCursors");

const DEFAULT_POLL_INTERVAL_MS = 20 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 40;
const DEFAULT_CLAIM_TTL_MS = 4 * 60 * 1000;

const DELHIVERY_TRACKING_EXCLUDED_SHIPPING_STATUSES = [
  "Pending",
  "Booked",
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
];

const trackingPollIntervalMs = () => {
  const n = Number(process.env.DELHIVERY_TRACKING_POLL_INTERVAL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : DEFAULT_POLL_INTERVAL_MS;
};

const trackingWorkerBatchSize = () => {
  const n = Number(process.env.DELHIVERY_TRACKING_BATCH_SIZE);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : DEFAULT_BATCH_SIZE;
};

const trackingClaimTtlMs = () => {
  const n = Number(process.env.DELHIVERY_TRACKING_CLAIM_TTL_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : DEFAULT_CLAIM_TTL_MS;
};

const scheduleNextPoll = (shipping, fromTime = new Date()) => {
  shipping.delhiveryTrackingNextPollAt = new Date(
    fromTime.getTime() + trackingPollIntervalMs()
  );
};

const trackingPollDueClause = (now) => ({
  $or: [
    { delhiveryTrackingNextPollAt: { $lte: now } },
    { delhiveryTrackingNextPollAt: null },
    { delhiveryTrackingNextPollAt: { $exists: false } },
  ],
});

const trackingClaimAvailableClause = (now) => ({
  $or: [
    { delhiveryTrackingClaimExpiresAt: { $lte: now } },
    { delhiveryTrackingClaimExpiresAt: null },
    { delhiveryTrackingClaimExpiresAt: { $exists: false } },
    { delhiveryTrackingClaimToken: "" },
    { delhiveryTrackingClaimToken: { $exists: false } },
  ],
});

const claimDelhiveryTrackingPoll = async (shippingId) => {
  const now = new Date();
  const token = crypto.randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + trackingClaimTtlMs());

  return Shipping.findOneAndUpdate(
    {
      _id: shippingId,
      ...delhiveryManifestReadyMongoFilter,
      shippingStatus: {
        $nin: DELHIVERY_TRACKING_EXCLUDED_SHIPPING_STATUSES,
      },
      $and: [
        trackingPollDueClause(now),
        trackingClaimAvailableClause(now),
      ],
    },
    {
      $set: {
        delhiveryTrackingClaimToken: token,
        delhiveryTrackingClaimExpiresAt: expires,
      },
    },
    { new: true }
  );
};

const releaseDelhiveryTrackingClaim = async (shippingId, claimToken) => {
  if (!shippingId || !claimToken) return;
  await Shipping.updateOne(
    { _id: shippingId, delhiveryTrackingClaimToken: claimToken },
    {
      $set: {
        delhiveryTrackingClaimToken: "",
        delhiveryTrackingClaimExpiresAt: null,
      },
    }
  );
};

const claimShippingsForTrackingPoll = async (candidates, limit) => {
  const claimed = [];
  for (const row of candidates) {
    if (claimed.length >= limit) break;
    const doc = await claimDelhiveryTrackingPoll(row._id);
    if (doc) claimed.push(doc);
  }
  return claimed;
};

const mapWaybillsForShipping = async (shipping, waybillToRaw) => {
  const manifest = await DelhiveryShipmentManifest.findOne({
    orderId: shipping.orderId,
  })
    .select("masterAwb childAwbs shipmentType packages")
    .lean();

  const waybills = collectOrderDelhiveryWaybills(shipping, manifest);
  const packageStatuses = [];

  for (const wb of waybills) {
    const hit = waybillToRaw.get(wb);
    if (!hit?.raw) {
      packageStatuses.push({ waybill: wb, aayshStatus: null, skipped: "missing_response" });
      continue;
    }
    const snapshot = buildLatestTrackingSnapshot(hit.raw);
    const mapped = resolveAayshStatusFromSnapshot(snapshot);
    packageStatuses.push({
      waybill: wb,
      aayshStatus: mapped.aayshStatus,
      snapshot,
      mapped,
    });
  }

  const isMps =
    shipping.delhiveryShipmentType === "MPS" ||
    manifest?.shipmentType === "MPS" ||
    waybills.length > 1;

  if (!isMps) {
    const single = packageStatuses[0];
    return {
      isMps: false,
      aayshStatus: single?.aayshStatus || null,
      snapshot: single?.snapshot,
      mapped: single?.mapped,
      packageStatuses,
    };
  }

  const agg = aggregateMpsPackageStatuses(packageStatuses);
  return {
    isMps: true,
    aayshStatus: agg.ok ? agg.aayshStatus : null,
    aggregation: agg,
    packageStatuses,
  };
};

const syncDelhiveryShippingFromTrack = async (shipping, order, waybillToRaw) => {
  const mapped = await mapWaybillsForShipping(shipping, waybillToRaw);
  const packageStatuses = mapped.packageStatuses || [];

  const { newScans } = partitionPackageScansForSync(
    shipping,
    packageStatuses,
    buildScanSyncKey
  );

  if (!newScans.length) {
    scheduleNextPoll(shipping);
    await shipping.save();
    return { ok: true, updated: false, reason: "no_new_scans" };
  }

  let aayshStatus = null;
  if (mapped.isMps) {
    const agg = aggregateMpsPackageStatuses(
      packageStatuses.map((p) => ({
        waybill: p.waybill,
        aayshStatus: p.aayshStatus,
      }))
    );
    aayshStatus = agg.ok ? agg.aayshStatus : null;
  } else {
    aayshStatus =
      newScans[0]?.aayshStatus || packageStatuses[0]?.aayshStatus || null;
  }

  if (!aayshStatus) {
    scheduleNextPoll(shipping);
    await shipping.save();
    return {
      ok: true,
      updated: false,
      reason:
        mapped.aggregation?.message ||
        newScans[0]?.mapped?.reason ||
        "unmapped",
    };
  }

  const driver = newScans.reduce((best, pkg) => {
    const t = pkg.snapshot?.eventTime?.getTime?.() || 0;
    const bt = best?.snapshot?.eventTime?.getTime?.() || 0;
    return t >= bt ? pkg : best;
  }, newScans[0]);

  const eventTime = driver.snapshot.eventTime || new Date();
  const remarks =
    driver.snapshot.remark ||
    `${driver.snapshot.statusType}/${driver.snapshot.status}`;

  const result = await applyShippingStatusWithTracking({
    shipping,
    order,
    status: aayshStatus,
    remarks,
    failureReason: driver.mapped?.failureReason || "",
    location: driver.snapshot.location || "",
    eventTime,
    updatedBy: null,
    skipIfUnchanged: true,
  });

  for (const pkg of newScans) {
    const et = pkg.snapshot.eventTime || eventTime;
    setWaybillCursor(shipping, pkg.waybill || pkg.snapshot.waybill, et, pkg.syncKey);
  }

  shipping.delhiveryTrackingLastError = "";
  scheduleNextPoll(shipping);
  await shipping.save();

  return {
    ok: true,
    updated: result.changed,
    status: aayshStatus,
    newScans: newScans.length,
  };
};

const findShippingsDueForDelhiveryTracking = async (limit) => {
  const now = new Date();
  const shippings = await Shipping.find({
    ...delhiveryManifestReadyMongoFilter,
    shippingStatus: { $nin: DELHIVERY_TRACKING_EXCLUDED_SHIPPING_STATUSES },
    $or: [
      { delhiveryTrackingNextPollAt: { $lte: now } },
      { delhiveryTrackingNextPollAt: null },
      { delhiveryTrackingNextPollAt: { $exists: false } },
    ],
  })
    .limit(limit)
    .exec();

  if (!shippings.length) return [];

  const orderIds = shippings.map((s) => s.orderId);
  const orders = await Order.find({ _id: { $in: orderIds } })
    .select("_id isReversePickup companyID")
    .lean();
  const orderMap = new Map(orders.map((o) => [String(o._id), o]));

  return shippings.filter((s) => {
    const order = orderMap.get(String(s.orderId));
    return shouldPollDelhiveryShipping(s, order);
  });
};

const collectWaybillsForShippings = async (shippings) => {
  const shippingByWaybill = new Map();
  const allWaybills = [];

  for (const shipping of shippings) {
    const manifest = await DelhiveryShipmentManifest.findOne({
      orderId: shipping.orderId,
    })
      .select("masterAwb childAwbs packages")
      .lean();
    const waybills = collectOrderDelhiveryWaybills(shipping, manifest);
    for (const wb of waybills) {
      if (!shippingByWaybill.has(wb)) {
        shippingByWaybill.set(wb, shipping);
        allWaybills.push(wb);
      }
    }
  }

  return { allWaybills, shippingByWaybill };
};

const runDelhiveryTrackingSyncOnce = async ({ source = "cron" } = {}) => {
  const limit = trackingWorkerBatchSize();
  const candidates = await findShippingsDueForDelhiveryTracking(limit * 3);
  const shippings = await claimShippingsForTrackingPoll(candidates, limit);

  if (!shippings.length) {
    return { ok: true, source, processed: 0, updated: 0, claimed: 0 };
  }

  const { allWaybills } = await collectWaybillsForShippings(shippings);
  const track = await fetchDelhiveryPackagesTrackBulk(allWaybills);

  if (!track.ok) {
    const message = track.message || "Delhivery tracking fetch failed";
    const now = new Date();
    for (const shipping of shippings) {
      const claimToken = shipping.delhiveryTrackingClaimToken;
      shipping.delhiveryTrackingLastError = String(message).slice(0, 500);
      scheduleNextPoll(shipping, now);
      await shipping.save();
      await releaseDelhiveryTrackingClaim(shipping._id, claimToken);
    }
    return {
      ok: false,
      source,
      processed: shippings.length,
      updated: 0,
      error_code: track.error_code,
      message,
      uncertain: track.uncertain,
    };
  }

  const waybillToRaw = parseBulkTrackResponse(track.raw);
  let updated = 0;
  const orderCache = new Map();

  for (const shipping of shippings) {
    const claimToken = shipping.delhiveryTrackingClaimToken;
    let order = orderCache.get(String(shipping.orderId));
    if (!order) {
      order = await Order.findById(shipping.orderId);
      if (order) orderCache.set(String(shipping.orderId), order);
    }

    try {
      if (!order) continue;
      const res = await syncDelhiveryShippingFromTrack(
        shipping,
        order,
        waybillToRaw
      );
      if (res.updated) updated += 1;
    } catch (err) {
      console.error(
        `[Delhivery tracking] order ${shipping.orderId}:`,
        err.message
      );
      shipping.delhiveryTrackingLastError = String(err.message || "").slice(
        0,
        500
      );
      scheduleNextPoll(shipping);
      await shipping.save();
    } finally {
      await releaseDelhiveryTrackingClaim(shipping._id, claimToken);
    }
  }

  return {
    ok: true,
    source,
    processed: shippings.length,
    updated,
    partial: track.partial,
    claimed: shippings.length,
  };
};

module.exports = {
  trackingPollIntervalMs,
  trackingClaimTtlMs,
  runDelhiveryTrackingSyncOnce,
  syncDelhiveryShippingFromTrack,
  findShippingsDueForDelhiveryTracking,
  mapWaybillsForShipping,
  scheduleNextPoll,
  claimDelhiveryTrackingPoll,
  releaseDelhiveryTrackingClaim,
  claimShippingsForTrackingPoll,
  isOlderScanForWaybill,
};