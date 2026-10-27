const assert = require("assert");
const { isStatusLocked, TERMINAL_REQUEST_STATUSES } = require("./reversePickupStatusSync");

assert.ok(TERMINAL_REQUEST_STATUSES.includes("failed"));
assert.strictEqual(isStatusLocked({ status: "failed", adminStatusLocked: false }), true);
assert.strictEqual(isStatusLocked({ status: "in_transit", adminStatusLocked: true }), true);
assert.strictEqual(isStatusLocked({ status: "in_transit", adminStatusLocked: false }), false);

console.log("reversePickupStatusSync.test.js: all assertions passed");
