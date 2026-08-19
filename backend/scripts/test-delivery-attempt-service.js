const {
  startDeliveryAttempt,
  failCurrentDeliveryAttempt,
  completeCurrentDeliveryAttempt,
  resolveDeliveryAttempts,
  formatAttemptDisplay,
} = require("../utils/deliveryAttemptService");

let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  }
};

const shipping = {
  deliveryAttempts: 0,
  deliveryAttemptHistory: [],
  attemptFailureReason: "",
};

startDeliveryAttempt(shipping, new Date("2026-01-01T10:00:00Z"));
failCurrentDeliveryAttempt(
  shipping,
  "Customer unavailable",
  new Date("2026-01-01T12:00:00Z")
);

startDeliveryAttempt(shipping, new Date("2026-01-02T10:00:00Z"));
failCurrentDeliveryAttempt(
  shipping,
  "Customer refused",
  new Date("2026-01-02T12:00:00Z")
);

startDeliveryAttempt(shipping, new Date("2026-01-03T10:00:00Z"));

assert(shipping.deliveryAttempts === 3, "should have 3 attempts");
assert(
  shipping.deliveryAttemptHistory[0].status === "Failed",
  "attempt 1 remains failed"
);
assert(
  shipping.deliveryAttemptHistory[0].failureReason === "Customer unavailable",
  "attempt 1 reason preserved"
);
assert(
  shipping.deliveryAttemptHistory[1].failureReason === "Customer refused",
  "attempt 2 reason preserved"
);
assert(
  shipping.deliveryAttemptHistory[2].status === "In Progress",
  "attempt 3 in progress"
);

failCurrentDeliveryAttempt(
  shipping,
  "Customer unavailable",
  new Date("2026-01-03T14:00:00Z")
);
startDeliveryAttempt(shipping, new Date("2026-01-04T10:00:00Z"));

assert(shipping.deliveryAttempts === 4, "fourth attempt started");
assert(
  shipping.deliveryAttemptHistory[0].failureReason === "Customer unavailable",
  "attempt 1 still unchanged after attempt 4"
);
assert(
  shipping.deliveryAttemptHistory[2].failureReason === "Customer unavailable",
  "attempt 3 updated to failed"
);
assert(
  shipping.deliveryAttemptHistory[3].status === "In Progress",
  "attempt 4 in progress"
);

const resolved = resolveDeliveryAttempts(shipping, []);
assert(resolved.total === 4, "resolved total is 4");
assert(
  formatAttemptDisplay(resolved.attempts[1]) === "Failed - Customer refused",
  "display format for failed attempt"
);

completeCurrentDeliveryAttempt(shipping, new Date("2026-01-04T15:00:00Z"));
assert(
  shipping.deliveryAttemptHistory[3].status === "Delivered",
  "attempt 4 delivered"
);
assert(
  shipping.deliveryAttemptHistory[1].failureReason === "Customer refused",
  "attempt 2 still preserved after delivery"
);

console.log(
  failed === 0
    ? "Delivery attempt service tests passed"
    : `${failed} test(s) failed`
);
process.exit(failed > 0 ? 1 : 0);
