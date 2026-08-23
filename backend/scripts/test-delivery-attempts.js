const {
  buildDeliveryAttempts,
} = require("../utils/buildDeliveryAttempts");

let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  }
};

const tracking = [
  { status: "Out For Delivery", eventTime: new Date("2026-01-01T10:00:00Z"), failureReason: "" },
  { status: "Undelivered", eventTime: new Date("2026-01-01T12:00:00Z"), failureReason: "Customer unavailable" },
  { status: "Out For Delivery", eventTime: new Date("2026-01-02T10:00:00Z"), failureReason: "" },
  { status: "Undelivered", eventTime: new Date("2026-01-02T12:00:00Z"), failureReason: "Address incorrect" },
  { status: "Out For Delivery", eventTime: new Date("2026-01-03T10:00:00Z"), failureReason: "" },
  { status: "Delivered", eventTime: new Date("2026-01-03T14:00:00Z"), failureReason: "" },
];

const result = buildDeliveryAttempts(tracking, { deliveryAttempts: 3 });

assert(result.total === 3, "total should be 3");
assert(result.attempts[0].outcome === "Failed", "attempt 1 failed");
assert(result.attempts[0].failure_reason === "Customer unavailable", "attempt 1 reason");
assert(result.attempts[2].outcome === "Delivered", "attempt 3 delivered");

const zero = buildDeliveryAttempts([], { deliveryAttempts: 0 });
assert(zero.total === 0, "zero attempts");
assert(zero.attempts.length === 0, "zero attempt list");

const fallback = buildDeliveryAttempts([], {
  deliveryAttempts: 1,
  shippingStatus: "Undelivered",
  attemptFailureReason: "Gate locked",
});
assert(fallback.attempts[0].failure_reason === "Gate locked", "fallback failure reason");

console.log(failed === 0 ? "Delivery attempt tests passed" : `${failed} test(s) failed`);
process.exit(failed > 0 ? 1 : 0);
