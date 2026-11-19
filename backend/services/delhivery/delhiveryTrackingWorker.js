const { runDelhiveryTrackingSyncOnce } = require("./delhiveryTrackingSync.service");

let workerInFlight = false;

const runDelhiveryTrackingWorkerOnce = async ({ source = "cron" } = {}) => {
  if (workerInFlight) {
    return { ok: true, skipped: true, reason: "worker_in_flight", source };
  }
  workerInFlight = true;
  try {
    return await runDelhiveryTrackingSyncOnce({ source });
  } finally {
    workerInFlight = false;
  }
};

module.exports = {
  runDelhiveryTrackingWorkerOnce,
};