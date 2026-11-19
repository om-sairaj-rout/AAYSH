const { runTrackonTrackingSyncOnce } = require("./trackonTrackingSync.service");

let workerInFlight = false;

const runTrackonTrackingWorkerOnce = async ({ source = "cron" } = {}) => {
  if (workerInFlight) {
    return { ok: true, skipped: true, reason: "worker_in_flight", source };
  }
  workerInFlight = true;
  try {
    return await runTrackonTrackingSyncOnce({ source });
  } finally {
    workerInFlight = false;
  }
};

module.exports = {
  runTrackonTrackingWorkerOnce,
};