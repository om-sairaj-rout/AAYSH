const crypto = require("crypto");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { applyShippingStatusWithTracking } = require("../../utils/shippingStatusTrackingUpdate");
const { fetchTrackonAwbTracking } = require("./trackonAwbTrackingApi");
const {
  parseTrackonTrackingPayload,
  buildTrackonEventSyncKey,
} = require("./trackonTrackParse");
const {
  mapTrackonCodeToAaysh,
  pickBestForwardTrackonStatusEvent,
  shouldApplyTrackonMappedStatus,
} = require("./trackonStatusMapping");
const {
  shouldPollTrackonShipping,
  trackonEligibleMongoFilter,
  TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES,
} = require("./trackonTrackingEligibility");
const {
  partitionTrackonEventsForSync,
  setTrackonCursor,
} = require("./trackonTrackingCursors");

const DEFAULT_POLL_INTERVAL_MS = 20 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 40;
const DEFAULT_CLAIM_TTL_MS = 4 * 60 * 1000;

const trackingPollIntervalMs = () => {
  const n = Number(process.env.TRACKON_TRACKING_POLL_INTERVAL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : DEFAULT_POLL_INTERVAL_MS;
};

const trackingWorkerBatchSize = () => {
  const n = Number(process.env.TRACKON_TRACKING_BATCH_SIZE);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : DEFAULT_BATCH_SIZE;
};

const trackingClaimTtlMs = () => {
  const n = Number(process.env.TRACKON_TRACKING_CLAIM_TTL_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : DEFAULT_CLAIM_TTL_MS;
};

const scheduleNextPoll = (shipping, fromTime = new Date()) => {
  shipping.trackonTrackingNextPollAt = new Date(
    fromTime.getTime() + trackingPollIntervalMs()
  );
};

const trackingPollDueClause = (now) => ({
  $or: [
    { trackonTrackingNextPollAt: { $lte: now } },
    { trackonTrackingNextPollAt: null },
    { trackonTrackingNextPollAt: { $exists: false } },
  ],
});

const trackingClaimAvailableClause = (now) => ({
  $or: [
    { trackonTrackingClaimExpiresAt: { $lte: now } },
    { trackonTrackingClaimExpiresAt: null },
    { trackonTrackingClaimExpiresAt: { $exists: false } },
    { trackonTrackingClaimToken: "" },
    { trackonTrackingClaimToken: { $exists: false } },
  ],
});

const claimTrackonTrackingPoll = async (shippingId) => {
  const now = new Date();
  const token = crypto.randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + trackingClaimTtlMs());

  return Shipping.findOneAndUpdate(
    {
      _id: shippingId,
      ...trackonEligibleMongoFilter,
      shippingStatus: {
        $nin: TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES,
      },
      $and: [trackingPollDueClause(now), trackingClaimAvailableClause(now)],
    },
    {
      $set: {
        trackonTrackingClaimToken: token,
        trackonTrackingClaimExpiresAt: expires,
      },
    },
    { new: true }
  );
};

const releaseTrackonTrackingClaim = async (shippingId, claimToken) => {
  if (!shippingId || !claimToken) return;
  await Shipping.updateOne(
    { _id: shippingId, trackonTrackingClaimToken: claimToken },
    {
      $set: {
        trackonTrackingClaimToken: "",
        trackonTrackingClaimExpiresAt: null,
      },
    }
  );
};

const claimShippingsForTrackonPoll = async (candidates, limit) => {
  const claimed = [];
  for (const row of candidates) {
    if (claimed.length >= limit) break;
    const doc = await claimTrackonTrackingPoll(row._id);
    if (doc) claimed.push(doc);
  }
  return claimed;
};

const findShippingsDueForTrackonTracking = async (limit) => {
  const now = new Date();
  const shippings = await Shipping.find({
    ...trackonEligibleMongoFilter,
    shippingStatus: { $nin: TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES },
    $or: [
      { trackonTrackingNextPollAt: { $lte: now } },
      { trackonTrackingNextPollAt: null },
      { trackonTrackingNextPollAt: { $exists: false } },
    ],
  })
    .limit(limit)
    .exec();

  if (!shippings.length) return [];

  const orderIds = shippings.map((s) => s.orderId);
  const orders = await Order.find({ _id: { $in: orderIds } })
    .select("_id isReversePickup")
    .lean();
  const orderMap = new Map(orders.map((o) => [String(o._id), o]));

  return shippings.filter((s) => {
    const order = orderMap.get(String(s.orderId));
    return shouldPollTrackonShipping(s, order);
  });
};

const syncTrackonShippingFromTrack = async (shipping, order, trackonRaw) => {
  const parsed = parseTrackonTrackingPayload(trackonRaw);
  if (!parsed.ok) {
    return { ok: false, updated: false, reason: parsed.message || "parse_failed" };
  }

  const awb = String(parsed.awb || shipping.awbNumber || "").trim();
  const { newEvents } = partitionTrackonEventsForSync(
    shipping,
    parsed.events,
    awb,
    buildTrackonEventSyncKey,
    mapTrackonCodeToAaysh
  );

  let anyChanged = false;

  for (const ev of newEvents) {
    const mapped =
      mapTrackonCodeToAaysh(ev.trackingCode) || {
        aayshStatus: null,
        unknownCode: true,
      };
    const eventTime = ev.eventAt || new Date();
    const location = ev.city || "";
    const remarks =
      ev.remarks ||
      [ev.trackingCode, ev.currentStatus].filter(Boolean).join(" ");

    if (mapped.reversePickupCode) {
      setTrackonCursor(shipping, awb, eventTime, ev.syncKey);
      continue;
    }

    if (mapped.skipStatusChange || mapped.pickupClosureFailed) {
      const failureReason = mapped.pickupClosureFailed
        ? ev.ndrReason || ev.currentStatus || "Pickup closure failed"
        : "";
      const result = await applyShippingStatusWithTracking({
        shipping,
        order,
        status: shipping.shippingStatus,
        remarks,
        failureReason,
        location,
        eventTime,
        updatedBy: null,
        skipIfUnchanged: true,
      });
      anyChanged = anyChanged || result.changed;
      setTrackonCursor(shipping, awb, eventTime, ev.syncKey);
      continue;
    }

    const targetStatus = mapped.aayshStatus;

    if (!targetStatus || mapped.unknownCode) {
      const result = await applyShippingStatusWithTracking({
        shipping,
        order,
        status: shipping.shippingStatus,
        remarks: `[${ev.trackingCode || "?"}] ${remarks}`,
        failureReason: "",
        location,
        eventTime,
        updatedBy: null,
        skipIfUnchanged: true,
      });
      anyChanged = anyChanged || result.changed;
      setTrackonCursor(shipping, awb, eventTime, ev.syncKey);
      continue;
    }

    if (!shouldApplyTrackonMappedStatus(shipping.shippingStatus, targetStatus)) {
      setTrackonCursor(shipping, awb, eventTime, ev.syncKey);
      continue;
    }

    const result = await applyShippingStatusWithTracking({
      shipping,
      order,
      status: targetStatus,
      remarks,
      failureReason: targetStatus === "Undelivered" ? ev.ndrReason || remarks : "",
      location,
      eventTime,
      updatedBy: null,
      skipIfUnchanged: true,
    });
    anyChanged = anyChanged || result.changed;
    setTrackonCursor(shipping, awb, eventTime, ev.syncKey);
  }

  const bestForward = pickBestForwardTrackonStatusEvent(parsed.events);
  if (
    bestForward &&
    shouldApplyTrackonMappedStatus(
      shipping.shippingStatus,
      bestForward.mapped.aayshStatus
    )
  ) {
    const eventTime = bestForward.ev.eventAt || new Date();
    const location = bestForward.ev.city || "";
    const remarks =
      bestForward.ev.remarks ||
      [bestForward.ev.trackingCode, bestForward.ev.currentStatus]
        .filter(Boolean)
        .join(" ");

    const result = await applyShippingStatusWithTracking({
      shipping,
      order,
      status: bestForward.mapped.aayshStatus,
      remarks,
      failureReason:
        bestForward.mapped.aayshStatus === "Undelivered"
          ? bestForward.ev.ndrReason || remarks
          : "",
      location,
      eventTime,
      updatedBy: null,
      skipIfUnchanged: true,
    });
    anyChanged = anyChanged || result.changed;
    const bestSyncKey =
      bestForward.ev.syncKey ||
      buildTrackonEventSyncKey({
        awb,
        trackingCode: bestForward.ev.trackingCode,
        eventAt: bestForward.ev.eventAt,
        currentStatus: bestForward.ev.currentStatus,
        city: bestForward.ev.city,
        remarks: bestForward.ev.remarks,
      });
    setTrackonCursor(shipping, awb, eventTime, bestSyncKey);
  }

  shipping.trackonTrackingLastError = "";
  scheduleNextPoll(shipping);
  await shipping.save();

  return {
    ok: true,
    updated: anyChanged,
    newEvents: newEvents.length,
    reason: newEvents.length ? undefined : "no_new_partitioned_events",
  };
};

const runTrackonTrackingSyncOnce = async ({ source = "cron" } = {}) => {
  const limit = trackingWorkerBatchSize();
  const candidates = await findShippingsDueForTrackonTracking(limit * 3);
  const shippings = await claimShippingsForTrackonPoll(candidates, limit);

  if (!shippings.length) {
    return { ok: true, source, processed: 0, updated: 0, claimed: 0 };
  }

  let updated = 0;
  const orderCache = new Map();

  for (const shipping of shippings) {
    const claimToken = shipping.trackonTrackingClaimToken;
    let order = orderCache.get(String(shipping.orderId));
    if (!order) {
      order = await Order.findById(shipping.orderId);
      if (order) orderCache.set(String(shipping.orderId), order);
    }

    try {
      if (!order) continue;

      const track = await fetchTrackonAwbTracking(shipping.awbNumber);

      if (!track.ok) {
        shipping.trackonTrackingLastError = String(track.message || "").slice(
          0,
          500
        );
        scheduleNextPoll(shipping);
        await shipping.save();
        continue;
      }

      const res = await syncTrackonShippingFromTrack(
        shipping,
        order,
        track.raw
      );
      if (res.updated) updated += 1;
    } catch (err) {
      console.error(`[Trackon tracking] order ${shipping.orderId}:`, err.message);
      shipping.trackonTrackingLastError = String(err.message || "").slice(0, 500);
      scheduleNextPoll(shipping);
      await shipping.save();
    } finally {
      await releaseTrackonTrackingClaim(shipping._id, claimToken);
    }
  }

  return {
    ok: true,
    source,
    processed: shippings.length,
    updated,
    claimed: shippings.length,
  };
};

module.exports = {
  trackingPollIntervalMs,
  trackingClaimTtlMs,
  runTrackonTrackingSyncOnce,
  syncTrackonShippingFromTrack,
  findShippingsDueForTrackonTracking,
  claimTrackonTrackingPoll,
  releaseTrackonTrackingClaim,
  claimShippingsForTrackonPoll,
  scheduleNextPoll,
};