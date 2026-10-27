const isPerformanceDebugEnabled = () =>
  process.env.DEBUG_PERFORMANCE === "true" ||
  process.env.DEBUG_PERFORMANCE === "1";

/** Logs only when DEBUG_PERFORMANCE=true (or 1). */
const perfLog = (...args) => {
  if (isPerformanceDebugEnabled()) {
    console.log(...args);
  }
};

module.exports = {
  isPerformanceDebugEnabled,
  perfLog,
};
