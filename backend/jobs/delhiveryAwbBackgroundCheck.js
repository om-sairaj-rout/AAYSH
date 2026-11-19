const { isDelhiveryConfigured } = require("../config/delhiveryConfig");
const {
  isAutoReplenishEnabled,
  getBackgroundCheckIntervalMs,
} = require("../config/delhiveryAwbConfig");
const { maybeAutoReplenish } = require("../services/delhivery/delhiveryAwbReplenishment");

let intervalHandle = null;

const startDelhiveryAwbBackgroundCheck = () => {
  if (intervalHandle) return;

  if (!isDelhiveryConfigured() || !isAutoReplenishEnabled()) {
    return;
  }

  const intervalMs = getBackgroundCheckIntervalMs();

  const run = () => {
    maybeAutoReplenish("background").catch((err) => {
      console.error("[delhivery-awb] background replenishment error:", err.message);
    });
  };

  run();
  intervalHandle = setInterval(run, intervalMs);
  if (intervalHandle.unref) {
    intervalHandle.unref();
  }

  console.log(
    `[delhivery-awb] background check started (every ${intervalMs}ms)`
  );
};

module.exports = {
  startDelhiveryAwbBackgroundCheck,
};
