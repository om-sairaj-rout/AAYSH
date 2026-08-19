const OUT_FOR_DELIVERY = "Out For Delivery";
const DELIVERY_FAILED = "Delivery Attempt Failed";
const DELIVERED = "Delivered";

const sortByEventTime = (events = []) =>
  [...events].sort((a, b) => {
    const timeA = new Date(a.eventTime || 0).getTime();
    const timeB = new Date(b.eventTime || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return String(a._id || "").localeCompare(String(b._id || ""));
  });

const buildAttemptsFromTracking = (trackingEvents = []) => {
  const sorted = sortByEventTime(trackingEvents);
  const outForDeliveryIndexes = sorted.reduce((indexes, event, index) => {
    if (event.status === OUT_FOR_DELIVERY) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  return outForDeliveryIndexes.map((startIndex, index) => {
    const attemptNumber = index + 1;
    const afterStart = sorted.slice(startIndex + 1);
    const nextOutForDeliveryIndex = afterStart.findIndex(
      (event) => event.status === OUT_FOR_DELIVERY
    );
    const attemptSegment =
      nextOutForDeliveryIndex === -1
        ? afterStart
        : afterStart.slice(0, nextOutForDeliveryIndex);

    const failedEvent = attemptSegment.find(
      (event) => event.status === DELIVERY_FAILED
    );
    if (failedEvent) {
      return {
        attempt_number: attemptNumber,
        outcome: "Failed",
        failure_reason: String(failedEvent.failureReason || "").trim(),
        event_time: failedEvent.eventTime || null,
      };
    }

    const deliveredEvent = attemptSegment.find(
      (event) => event.status === DELIVERED
    );
    if (deliveredEvent) {
      return {
        attempt_number: attemptNumber,
        outcome: "Delivered",
        failure_reason: "",
        event_time: deliveredEvent.eventTime || null,
      };
    }

    return {
      attempt_number: attemptNumber,
      outcome: "In Progress",
      failure_reason: "",
      event_time: sorted[startIndex]?.eventTime || null,
    };
  });
};

const buildFallbackAttempts = (shipping = {}) => {
  const total = Number(shipping.deliveryAttempts) || 0;
  if (total <= 0) {
    return [];
  }

  const attempts = [];
  const shippingStatus = shipping.shippingStatus || "";
  const lastFailureReason = String(shipping.attemptFailureReason || "").trim();

  for (let attemptNumber = 1; attemptNumber <= total; attemptNumber += 1) {
    const isLastAttempt = attemptNumber === total;

    if (isLastAttempt && shippingStatus === DELIVERED) {
      attempts.push({
        attempt_number: attemptNumber,
        outcome: "Delivered",
        failure_reason: "",
        event_time: shipping.deliveredAt || null,
      });
      continue;
    }

    if (isLastAttempt && shippingStatus === DELIVERY_FAILED) {
      attempts.push({
        attempt_number: attemptNumber,
        outcome: "Failed",
        failure_reason: lastFailureReason,
        event_time: shipping.outForDeliveryAt || null,
      });
      continue;
    }

    if (isLastAttempt && shippingStatus === OUT_FOR_DELIVERY) {
      attempts.push({
        attempt_number: attemptNumber,
        outcome: "In Progress",
        failure_reason: "",
        event_time: shipping.outForDeliveryAt || null,
      });
      continue;
    }

    attempts.push({
      attempt_number: attemptNumber,
      outcome: "Failed",
      failure_reason: "",
      event_time: null,
    });
  }

  if (
    attempts.length > 0 &&
    lastFailureReason &&
    attempts[attempts.length - 1].outcome === "Failed" &&
    !attempts[attempts.length - 1].failure_reason
  ) {
    attempts[attempts.length - 1].failure_reason = lastFailureReason;
  }

  return attempts;
};

const buildDeliveryAttempts = (trackingEvents = [], shipping = {}) => {
  const fromTracking = buildAttemptsFromTracking(trackingEvents);
  const attempts =
    fromTracking.length > 0
      ? fromTracking
      : buildFallbackAttempts(shipping);

  const total =
  attempts.length > 0
    ? attempts.length
    : Number(shipping.deliveryAttempts) || 0;

  return {
    total,
    attempts,
  };
};

const formatDeliveryAttemptsForExport = (deliveryAttemptDetails) => {
  if (!deliveryAttemptDetails?.attempts?.length) {
    return deliveryAttemptDetails?.total
      ? `Delivery Attempts: ${deliveryAttemptDetails.total}`
      : "Delivery Attempts: 0";
  }

  const lines = deliveryAttemptDetails.attempts.map((attempt) => {
    const label = `Attempt ${attempt.attempt_number}`;
    if (attempt.outcome === "Failed") {
      const reason = attempt.failure_reason || "No reason provided";
      return `${label}: Failed — ${reason}`;
    }
    if (attempt.outcome === "Delivered") {
      return `${label}: Delivered`;
    }
    if (attempt.outcome === "In Progress") {
      return `${label}: In Progress`;
    }
    return `${label}: ${attempt.outcome}`;
  });

  return `Delivery Attempts: ${deliveryAttemptDetails.total}; ${lines.join("; ")}`;
};

module.exports = {
  buildDeliveryAttempts,
  formatDeliveryAttemptsForExport,
};
