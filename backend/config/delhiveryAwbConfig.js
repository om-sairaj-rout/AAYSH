const parsePositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
};

const getReplenishThreshold = () =>
  parsePositiveInt(process.env.DELHIVERY_AWB_REPLENISH_THRESHOLD, 20);

const getReplenishBatchSize = () =>
  parsePositiveInt(process.env.DELHIVERY_AWB_REPLENISH_BATCH, 50);

const isAutoReplenishEnabled = () => {
  const flag = String(
    process.env.DELHIVERY_AWB_AUTO_REPLENISH_ENABLED || "true"
  )
    .trim()
    .toLowerCase();
  return flag !== "false";
};

const getBulkCooldownMs = () =>
  parsePositiveInt(process.env.DELHIVERY_AWB_BULK_COOLDOWN_MS, 5 * 60 * 1000);

const getReplenishmentLockTtlMs = () =>
  parsePositiveInt(
    process.env.DELHIVERY_AWB_REPLENISH_LOCK_TTL_MS,
    5 * 60 * 1000
  );

const getBackgroundCheckIntervalMs = () =>
  parsePositiveInt(
    process.env.DELHIVERY_AWB_BACKGROUND_CHECK_MS,
    10 * 60 * 1000
  );

/**
 * Delhivery waybill docs show ?token= in query. Other APIs use Authorization header.
 * query | header | both
 */
const getWaybillAuthMode = () => {
  const mode = String(process.env.DELHIVERY_WAYBILL_AUTH_MODE || "both")
    .trim()
    .toLowerCase();
  if (["query", "header", "both"].includes(mode)) return mode;
  return "both";
};

module.exports = {
  getReplenishThreshold,
  getReplenishBatchSize,
  isAutoReplenishEnabled,
  getBulkCooldownMs,
  getReplenishmentLockTtlMs,
  getBackgroundCheckIntervalMs,
  getWaybillAuthMode,
};
