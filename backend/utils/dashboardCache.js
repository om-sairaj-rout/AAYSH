const cache = new Map();
const DEFAULT_TTL_MS = 30_000;

const stableKey = (obj) => JSON.stringify(obj);

const getCached = (key) => {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    cache.delete(key);
    return null;
  }
  return row.value;
};

const setCached = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const invalidateDashboardCache = () => {
  cache.clear();
};

module.exports = {
  stableKey,
  getCached,
  setCached,
  invalidateDashboardCache,
  DEFAULT_TTL_MS,
};
