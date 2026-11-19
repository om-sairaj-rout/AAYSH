const DEFAULT_STAGING_BASE = "https://staging-express.delhivery.com";
const DEFAULT_PRODUCTION_BASE = "https://track.delhivery.com";
const DEFAULT_TIMEOUT_MS = 15000;

const getDelhiveryEnv = () =>
  String(process.env.DELHIVERY_ENV || "staging").trim().toLowerCase();

const getDelhiveryBaseUrl = () => {
  const configured = String(process.env.DELHIVERY_BASE_URL || "").trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  return getDelhiveryEnv() === "production"
    ? DEFAULT_PRODUCTION_BASE
    : DEFAULT_STAGING_BASE;
};

const getDelhiveryApiToken = () =>
  String(process.env.DELHIVERY_API_TOKEN || "").trim();

const isDelhiveryConfigured = () => Boolean(getDelhiveryApiToken());

const getDelhiveryRequestTimeoutMs = () => {
  const parsed = Number(process.env.DELHIVERY_REQUEST_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TIMEOUT_MS;
};

const isDelhiveryCodCheckEnabled = () => {
  if (!isDelhiveryConfigured()) return false;
  const flag = String(process.env.DELHIVERY_COD_CHECK_ENABLED || "true")
    .trim()
    .toLowerCase();
  return flag !== "false";
};

const VALID_SERVICEABILITY_PRODUCT_TYPES = new Set(["B2C", "Heavy"]);

/**
 * Which Delhivery pincode serviceability API to use for COD precheck (one call only).
 * Override per request via delhivery_product_type query/body when testing.
 */
const getDelhiveryServiceabilityProductType = (override) => {
  const fromOverride = String(override || "").trim();
  if (fromOverride && VALID_SERVICEABILITY_PRODUCT_TYPES.has(fromOverride)) {
    return fromOverride;
  }

  const fromEnv = String(process.env.DELHIVERY_SERVICEABILITY_PRODUCT_TYPE || "B2C")
    .trim();
  if (VALID_SERVICEABILITY_PRODUCT_TYPES.has(fromEnv)) {
    return fromEnv;
  }
  return "B2C";
};

module.exports = {
  getDelhiveryEnv,
  getDelhiveryBaseUrl,
  getDelhiveryApiToken,
  isDelhiveryConfigured,
  getDelhiveryRequestTimeoutMs,
  isDelhiveryCodCheckEnabled,
  getDelhiveryServiceabilityProductType,
  VALID_SERVICEABILITY_PRODUCT_TYPES,
};
