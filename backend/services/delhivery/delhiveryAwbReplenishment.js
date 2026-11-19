const { DelhiveryAwbPoolMeta } = require("../../models/delhiveryAwbPoolMeta.model");
const {
  getReplenishThreshold,
  getReplenishBatchSize,
  isAutoReplenishEnabled,
  getBulkCooldownMs,
  getReplenishmentLockTtlMs,
} = require("../../config/delhiveryAwbConfig");
const {
  countByStatus,
  saveWaybillNumbers,
} = require("./delhiveryAwbPoolService");
const { fetchBulkWaybills, fetchSingleWaybill } = require("./delhiveryWaybillApi");

const acquireReplenishmentLock = async () => {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + getReplenishmentLockTtlMs());

  const meta = await DelhiveryAwbPoolMeta.findOneAndUpdate(
    {
      poolKey: "default",
      $or: [
        { replenishmentRunning: { $ne: true } },
        { replenishmentLockUntil: { $lte: now } },
        { replenishmentLockUntil: null },
      ],
    },
    {
      $set: {
        replenishmentRunning: true,
        replenishmentLockUntil: lockUntil,
        lastReplenishmentStatus: "running",
      },
    },
    { new: true }
  );

  return Boolean(meta);
};

const releaseReplenishmentLock = async (patch = {}) => {
  await DelhiveryAwbPoolMeta.findOneAndUpdate(
    { poolKey: "default" },
    {
      $set: {
        replenishmentRunning: false,
        replenishmentLockUntil: null,
        ...patch,
      },
    }
  );
};

const isBulkCooldownActive = async () => {
  const meta = await DelhiveryAwbPoolMeta.getPoolMeta();
  if (!meta.lastBulkRequestAt) return false;
  const elapsed = Date.now() - new Date(meta.lastBulkRequestAt).getTime();
  return elapsed < getBulkCooldownMs();
};

const runBulkFetchAndStore = async ({
  count,
  trigger = "manual",
  respectCooldown = true,
}) => {
  if (respectCooldown && (await isBulkCooldownActive())) {
    return {
      success: false,
      skipped: true,
      reason: "RATE_LIMIT_COOLDOWN",
      message:
        "Delhivery bulk waybill cooldown is active. Wait before another bulk request.",
    };
  }

  const lockAcquired = await acquireReplenishmentLock();
  if (!lockAcquired) {
    return {
      success: false,
      skipped: true,
      reason: "REPLENISHMENT_IN_PROGRESS",
      message: "Another Delhivery AWB fetch/replenishment is already running.",
    };
  }

  const startedAt = new Date();

  try {
    await DelhiveryAwbPoolMeta.findOneAndUpdate(
      { poolKey: "default" },
      { $set: { lastBulkRequestAt: startedAt, lastTrigger: trigger } }
    );

    const apiResult = await fetchBulkWaybills(count);

    if (apiResult.api_error) {
      const historyEntry = {
        at: startedAt,
        trigger,
        requested: apiResult.requested || count,
        received: 0,
        saved: 0,
        duplicates: 0,
        invalid: 0,
        status: "failed",
        error: apiResult.message,
      };

      await DelhiveryAwbPoolMeta.findOneAndUpdate(
        { poolKey: "default" },
        {
          $set: {
            replenishmentRunning: false,
            replenishmentLockUntil: null,
            lastReplenishmentStatus: "failed",
            lastReplenishmentAt: startedAt,
            lastRequestedCount: apiResult.requested || count,
            lastReceivedCount: 0,
            lastSavedCount: 0,
            lastDuplicateCount: 0,
            lastInvalidCount: 0,
            lastError: apiResult.message,
            lastTrigger: trigger,
          },
          $push: {
            fetchHistory: { $each: [historyEntry], $position: 0, $slice: 30 },
          },
        }
      );

      return {
        success: false,
        skipped: false,
        ...apiResult,
      };
    }

    const storeResult = await saveWaybillNumbers({
      awbNumbers: apiResult.awbNumbers,
      source: "bulk",
      metadata: { trigger, http_status: apiResult.http_status },
    });

    const historyEntry = {
      at: startedAt,
      trigger,
      requested: apiResult.requested || count,
      received: storeResult.valid,
      saved: storeResult.saved,
      duplicates: storeResult.duplicates,
      invalid: storeResult.invalid,
      status: "success",
      error: "",
    };

    await DelhiveryAwbPoolMeta.findOneAndUpdate(
      { poolKey: "default" },
      {
        $set: {
          replenishmentRunning: false,
          replenishmentLockUntil: null,
          lastReplenishmentStatus: "success",
          lastReplenishmentAt: startedAt,
          lastRequestedCount: apiResult.requested || count,
          lastReceivedCount: storeResult.valid,
          lastSavedCount: storeResult.saved,
          lastDuplicateCount: storeResult.duplicates,
          lastInvalidCount: storeResult.invalid,
          lastError: "",
          lastTrigger: trigger,
        },
        $push: {
          fetchHistory: { $each: [historyEntry], $position: 0, $slice: 30 },
        },
      }
    );

    return {
      success: true,
      trigger,
      api: apiResult,
      store: storeResult,
    };
  } catch (err) {
    await releaseReplenishmentLock({
      lastReplenishmentStatus: "failed",
      lastReplenishmentAt: startedAt,
      lastError: err.message,
      lastTrigger: trigger,
    });
    return {
      success: false,
      message: err.message || "Delhivery bulk fetch failed",
    };
  }
};

const runSingleFetchAndStore = async ({ trigger = "manual" } = {}) => {
  const apiResult = await fetchSingleWaybill();
  if (apiResult.api_error) {
    return { success: false, ...apiResult };
  }

  const storeResult = await saveWaybillNumbers({
    awbNumbers: apiResult.awbNumbers,
    source: "single",
    metadata: { trigger, http_status: apiResult.http_status },
  });

  const meta = await DelhiveryAwbPoolMeta.getPoolMeta();
  const historyEntry = {
    at: new Date(),
    trigger,
    requested: 1,
    received: storeResult.valid,
    saved: storeResult.saved,
    duplicates: storeResult.duplicates,
    invalid: storeResult.invalid,
    status: "success",
    error: "",
  };
  meta.fetchHistory = [historyEntry, ...(meta.fetchHistory || [])].slice(
    0,
    30
  );
  await meta.save();

  return { success: true, api: apiResult, store: storeResult };
};

const maybeAutoReplenish = async (trigger = "auto") => {
  if (!isAutoReplenishEnabled()) {
    return { skipped: true, reason: "AUTO_REPLENISH_DISABLED" };
  }

  const { available } = await countByStatus();
  const threshold = getReplenishThreshold();
  // Replenish based on `available` only (not reserved/booked/assigned/used/failed).
  if (available >= threshold) {
    return {
      skipped: true,
      reason: "ABOVE_THRESHOLD",
      available,
      threshold,
    };
  }

  const batchSize = getReplenishBatchSize();
  return runBulkFetchAndStore({
    count: batchSize,
    trigger,
    respectCooldown: true,
  });
};

let postConsumeReplenishQueued = false;

/**
 * Fire-and-forget replenishment check so order reservation is not blocked on Delhivery HTTP.
 * Coalesces multiple reservations in the same event-loop turn into one check.
 */
const scheduleDelhiveryAwbReplenishmentCheck = () => {
  if (postConsumeReplenishQueued) {
    return;
  }
  postConsumeReplenishQueued = true;
  setImmediate(() => {
    postConsumeReplenishQueued = false;
    maybeAutoReplenish("post_consume").catch((err) => {
      console.error(
        "[delhivery-awb] post-consume replenishment error:",
        err.message
      );
    });
  });
};

/**
 * Call after a Delhivery AWB is consumed from the pool (e.g. reserved for an order).
 */
const afterDelhiveryAwbConsumed = () => {
  scheduleDelhiveryAwbReplenishmentCheck();
  return Promise.resolve();
};

module.exports = {
  runBulkFetchAndStore,
  runSingleFetchAndStore,
  maybeAutoReplenish,
  scheduleDelhiveryAwbReplenishmentCheck,
  afterDelhiveryAwbConsumed,
};
