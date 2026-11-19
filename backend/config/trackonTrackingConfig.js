const DEFAULT_BASE_URL = "https://api.trackon.in";
const DEFAULT_TIMEOUT_MS = 15000;
const TRACKING_PATH = "/CrmApi/t1/AWBTrackingCustomer";

const getTrackonTrackingBaseUrl = () => {
  const configured = String(process.env.TRACKON_TRACKING_BASE_URL || "").trim();
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, "");
};

const getTrackonTrackingPath = () => TRACKING_PATH;

const getTrackonAppKey = () => String(process.env.TRACKON_APP_KEY || "").trim();
const getTrackonUserId = () => String(process.env.TRACKON_USER_ID || "").trim();
const getTrackonPassword = () => String(process.env.TRACKON_PASSWORD || "").trim();

const isTrackonTrackingConfigured = () =>
  Boolean(
    getTrackonAppKey() &&
      getTrackonUserId() &&
      getTrackonPassword()
  );

const isTrackonTrackingEnabled = () =>
  String(process.env.TRACKON_TRACKING_ENABLED || "false")
    .trim()
    .toLowerCase() === "true";

const getTrackonRequestTimeoutMs = () => {
  const parsed = Number(process.env.TRACKON_TRACKING_REQUEST_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

module.exports = {
  getTrackonTrackingBaseUrl,
  getTrackonTrackingPath,
  getTrackonAppKey,
  getTrackonUserId,
  getTrackonPassword,
  isTrackonTrackingConfigured,
  isTrackonTrackingEnabled,
  getTrackonRequestTimeoutMs,
};