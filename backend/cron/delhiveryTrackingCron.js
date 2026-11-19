const cron = require("node-cron");
const {
  runDelhiveryTrackingWorkerOnce,
} = require("../services/delhivery/delhiveryTrackingWorker");

const isEnabled = () =>
  String(process.env.DELHIVERY_TRACKING_WORKER_ENABLED || "true")
    .trim()
    .toLowerCase() !== "false";

const startDelhiveryTrackingCron = () => {
  if (!isEnabled()) {
    console.log("[Delhivery tracking worker] cron disabled");
    return;
  }

  cron.schedule(
    "*/10 * * * *",
    async () => {
      try {
        await runDelhiveryTrackingWorkerOnce({ source: "cron" });
      } catch (err) {
        console.error("[Delhivery tracking worker cron]", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("[Delhivery tracking worker] cron scheduled (every 10 minutes)");
};

module.exports = { startDelhiveryTrackingCron };