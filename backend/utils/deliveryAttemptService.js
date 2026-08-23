const { buildDeliveryAttempts } = require("./buildDeliveryAttempts");

const ATTEMPT_IN_PROGRESS = "In Progress";
const ATTEMPT_FAILED = "Failed";
const ATTEMPT_DELIVERED = "Delivered";

const ensureHistoryArray = (shipping) => {
  if (!Array.isArray(shipping.deliveryAttemptHistory)) {
    shipping.deliveryAttemptHistory = [];
  }
};

const markHistoryModified = (shipping) => {
  if (typeof shipping.markModified === "function") {
    shipping.markModified("deliveryAttemptHistory");
  }
};

const startDeliveryAttempt = (shipping, eventTime = new Date()) => {
  ensureHistoryArray(shipping);
  shipping.deliveryAttempts = Number(shipping.deliveryAttempts || 0) + 1;
  shipping.attemptFailureReason = "";
  shipping.outForDeliveryAt = eventTime;
  shipping.deliveryAttemptHistory.push({
    attemptNumber: shipping.deliveryAttempts,
    status: ATTEMPT_IN_PROGRESS,
    failureReason: "",
    startedAt: eventTime,
    completedAt: null,
  });
  markHistoryModified(shipping);
};

const findLatestInProgressAttempt = (shipping) => {
  ensureHistoryArray(shipping);
  for (let index = shipping.deliveryAttemptHistory.length - 1; index >= 0; index -= 1) {
    if (shipping.deliveryAttemptHistory[index].status === ATTEMPT_IN_PROGRESS) {
      return shipping.deliveryAttemptHistory[index];
    }
  }
  return null;
};

const failCurrentDeliveryAttempt = (
  shipping,
  failureReason = "",
  eventTime = new Date()
) => {
  const reason = String(failureReason || "").trim();
  shipping.attemptFailureReason = reason;

  const currentAttempt = findLatestInProgressAttempt(shipping);
  if (currentAttempt) {
    currentAttempt.status = ATTEMPT_FAILED;
    currentAttempt.failureReason = reason;
    currentAttempt.completedAt = eventTime;
    markHistoryModified(shipping);
    return currentAttempt;
  }

  ensureHistoryArray(shipping);
  const attemptNumber = Math.max(
    Number(shipping.deliveryAttempts || 0),
    shipping.deliveryAttemptHistory.length
  );

  if (attemptNumber === 0) {
    shipping.deliveryAttempts = 1;
    shipping.deliveryAttemptHistory.push({
      attemptNumber: 1,
      status: ATTEMPT_FAILED,
      failureReason: reason,
      startedAt: eventTime,
      completedAt: eventTime,
    });
  } else {
    shipping.deliveryAttemptHistory.push({
      attemptNumber: attemptNumber + 1,
      status: ATTEMPT_FAILED,
      failureReason: reason,
      startedAt: eventTime,
      completedAt: eventTime,
    });
    shipping.deliveryAttempts = attemptNumber + 1;
  }

  markHistoryModified(shipping);
  return shipping.deliveryAttemptHistory[shipping.deliveryAttemptHistory.length - 1];
};

const completeCurrentDeliveryAttempt = (shipping, eventTime = new Date()) => {
  const currentAttempt = findLatestInProgressAttempt(shipping);
  if (!currentAttempt) {
    return null;
  }

  currentAttempt.status = ATTEMPT_DELIVERED;
  currentAttempt.failureReason = "";
  currentAttempt.completedAt = eventTime;
  markHistoryModified(shipping);
  return currentAttempt;
};

const formatAttemptForApi = (entry) => ({
  attempt_number: entry.attemptNumber,
  outcome: entry.status,
  failure_reason: entry.failureReason || "",
  event_time: entry.completedAt || entry.startedAt || null,
});

const resolveDeliveryAttempts = (shipping = {}, trackingEvents = []) => {
  const history = Array.isArray(shipping.deliveryAttemptHistory)
    ? shipping.deliveryAttemptHistory
    : [];

  if (history.length > 0) {
    const attempts = [...history]
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
      .map(formatAttemptForApi);

    return {
      total: Math.max(Number(shipping.deliveryAttempts || 0), attempts.length),
      attempts,
    };
  }

  return buildDeliveryAttempts(trackingEvents, shipping);
};

const formatAttemptDisplay = (attempt) => {
  if (!attempt) {
    return "—";
  }

  const outcome = attempt.outcome || attempt.status;
  if (outcome === ATTEMPT_FAILED) {
    const reason =
      attempt.failure_reason ||
      attempt.failureReason ||
      "No reason provided";
    return `Failed - ${reason}`;
  }

  if (outcome === ATTEMPT_DELIVERED) {
    return ATTEMPT_DELIVERED;
  }

  if (outcome === ATTEMPT_IN_PROGRESS) {
    return ATTEMPT_IN_PROGRESS;
  }

  return String(outcome);
};

const applyAdminDeliveryAttempts = (shipping, attempts = []) => {
  if (!Array.isArray(attempts)) {
    throw new Error("delivery_attempts must be an array.");
  }

  ensureHistoryArray(shipping);

  const nextHistory = attempts
    .map((item, index) => {
      const attemptNumber = Number(
        item.attempt_number ?? item.attemptNumber ?? index + 1
      );
      if (!Number.isFinite(attemptNumber) || attemptNumber < 1) {
        throw new Error("Each delivery attempt must have a valid attempt number.");
      }

      const rawStatus = String(
        item.status ?? item.outcome ?? ATTEMPT_FAILED
      ).trim();
      let status = ATTEMPT_FAILED;
      if (
        [ATTEMPT_IN_PROGRESS, ATTEMPT_FAILED, ATTEMPT_DELIVERED].includes(
          rawStatus
        )
      ) {
        status = rawStatus;
      } else if (/deliver/i.test(rawStatus) && !/fail/i.test(rawStatus)) {
        status = ATTEMPT_DELIVERED;
      } else if (/progress|ofd|out for delivery/i.test(rawStatus)) {
        status = ATTEMPT_IN_PROGRESS;
      }

      const failureReason = String(
        item.failure_reason ?? item.failureReason ?? ""
      ).trim();
      const eventTime =
        item.event_time || item.completedAt || item.startedAt || new Date();

      return {
        attemptNumber,
        status,
        failureReason: status === ATTEMPT_FAILED ? failureReason : "",
        startedAt: item.startedAt || eventTime,
        completedAt: status === ATTEMPT_IN_PROGRESS ? null : eventTime,
      };
    })
    .sort((a, b) => a.attemptNumber - b.attemptNumber);

  shipping.deliveryAttemptHistory = nextHistory;
  shipping.deliveryAttempts = nextHistory.length;
  const lastFailed = [...nextHistory]
    .reverse()
    .find((entry) => entry.status === ATTEMPT_FAILED);
  shipping.attemptFailureReason = lastFailed?.failureReason || "";
  markHistoryModified(shipping);
};

module.exports = {
  ATTEMPT_IN_PROGRESS,
  ATTEMPT_FAILED,
  ATTEMPT_DELIVERED,
  startDeliveryAttempt,
  failCurrentDeliveryAttempt,
  completeCurrentDeliveryAttempt,
  resolveDeliveryAttempts,
  formatAttemptDisplay,
  formatAttemptForApi,
  applyAdminDeliveryAttempts,
};
