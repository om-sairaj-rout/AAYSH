const cron = require("node-cron");
const { isTrackonTrackingEnabled } = require("../config/trackonTrackingConfig");
const { runTrackonTrackingWorkerOnce } = require("../services/trackon/trackonTrackingWorker");

const startTrackonTrackingCron = () => {
  if (!isTrackonTrackingEnabled()) {
    console.log("[Trackon tracking worker] cron disabled");
    return;
  }

  cron.schedule(
    "*/10 * * * *",
    async () => {
      try {
        await runTrackonTrackingWorkerOnce({ source: "cron" });
      } catch (err) {
        console.error("[Trackon tracking worker cron]", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("[Trackon tracking worker] cron scheduled (every 10 minutes)");
};

module.exports = { startTrackonTrackingCron };