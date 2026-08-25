const {
  resolvePermissions,
  canAccess,
} = require("../utils/permissions");

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL: ${message}`);
};

const viewer = resolvePermissions("viewer", {});
const operator = resolvePermissions("operator", {});
const owner = resolvePermissions("owner", {});

ALL_SECTION_KEYS = require("../constants/permissions").ALL_SECTION_KEYS;

ALL_SECTION_KEYS.forEach((section) => {
  assert(canAccess(viewer, section, "read"), `viewer can read ${section}`);
  assert(!canAccess(viewer, section, "write"), `viewer cannot write ${section}`);
});

assert(canAccess(operator, "orders", "write"), "operator can write orders");
assert(canAccess(operator, "team", "read") === false, "operator cannot read team");
assert(!canAccess(operator, "team", "write"), "operator cannot write team");

assert(canAccess(owner, "orders", "write"), "owner can write orders");
assert(canAccess(owner, "team", "write"), "owner can write team");

const readOnlyOrders = resolvePermissions("operator", {
  orders: { read: true, write: false },
});
assert(canAccess(readOnlyOrders, "orders", "read"), "custom read-only orders: read allowed");
assert(!canAccess(readOnlyOrders, "orders", "write"), "custom read-only orders: write denied");

const readDoesNotGrantWrite = resolvePermissions("viewer", {
  orders: { read: true, write: false },
});
assert(
  !canAccess(readDoesNotGrantWrite, "orders", "write"),
  "read permission must not grant write permission"
);

const pickupOnlyStored = resolvePermissions("operator", {
  pickup: { read: true, write: false },
});
assert(
  canAccess(pickupOnlyStored, "reversePickup", "read"),
  "reversePickup inherits pickup read when not explicitly stored"
);
assert(
  !canAccess(pickupOnlyStored, "reversePickup", "write"),
  "reversePickup inherits pickup write denial when not explicitly stored"
);

assert(
  canAccess(operator, "reversePickup", "write"),
  "operator can write reversePickup by default"
);

console.log(`Permission tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
