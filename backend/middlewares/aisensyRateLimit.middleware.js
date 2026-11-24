const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 60;

const getWindowMs = () => {
  const n = Number(process.env.AISENSY_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(n) && n >= 10_000 ? n : DEFAULT_WINDOW_MS;
};

const getMaxRequests = () => {
  const n = Number(process.env.AISENSY_RATE_LIMIT_MAX);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : DEFAULT_MAX;
};

const buckets = new Map();

const pruneBucket = (bucket, now, windowMs) => {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
};

const aisensyRateLimit = (req, res, next) => {
  const windowMs = getWindowMs();
  const max = getMaxRequests();
  const key = `${req.ip || "unknown"}|${String(req.headers["x-aaysh-integration-key"] || "").slice(0, 8)}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  pruneBucket(bucket, now, windowMs);

  if (bucket.timestamps.length >= max) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  bucket.timestamps.push(now);
  return next();
};

module.exports = { aisensyRateLimit, getMaxRequests, getWindowMs };