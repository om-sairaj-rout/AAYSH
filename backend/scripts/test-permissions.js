const {
  resolvePermissions,
  canAccess,
  userCanAccess,
} = require("../utils/permissions");

const { ALL_SECTION_KEYS, ADMIN_ONLY_SECTION_KEYS } = require("../constants/permissions");

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

const viewer = resolvePermissions("viewer", {}, { userRole: "user" });
const operator = resolvePermissions("operator", {}, { userRole: "user" });
const owner = resolvePermissions("owner", {}, { userRole: "user" });

const companySections = ALL_SECTION_KEYS.filter(
  (section) => !ADMIN_ONLY_SECTION_KEYS.includes(section)
);

companySections.forEach((section) => {
  assert(canAccess(viewer, section, "read"), `viewer can read ${section}`);
  assert(!canAccess(viewer, section, "write"), `viewer cannot write ${section}`);
});

ADMIN_ONLY_SECTION_KEYS.forEach((section) => {
  assert(!canAccess(viewer, section, "read"), `viewer cannot read admin section ${section}`);
  assert(!canAccess(owner, section, "write"), `owner cannot write admin section ${section}`);
});

assert(canAccess(operator, "orders", "write"), "operator can write orders");
assert(canAccess(operator, "team", "read") === false, "operator cannot read team");
assert(!canAccess(operator, "team", "write"), "operator cannot write team");

assert(canAccess(owner, "orders", "write"), "owner can write orders");
assert(canAccess(owner, "team", "write"), "owner can write team");
assert(!canAccess(owner, "update", "read"), "owner cannot access update section");

const readOnlyOrders = resolvePermissions(
  "operator",
  { orders: { read: true, write: false } },
  { userRole: "user" }
);
assert(canAccess(readOnlyOrders, "orders", "read"), "custom read-only orders: read allowed");
assert(!canAccess(readOnlyOrders, "orders", "write"), "custom read-only orders: write denied");

const readDoesNotGrantWrite = resolvePermissions(
  "viewer",
  { orders: { read: true, write: false } },
  { userRole: "user" }
);
assert(
  !canAccess(readDoesNotGrantWrite, "orders", "write"),
  "read permission must not grant write permission"
);

const pickupOnlyStored = resolvePermissions(
  "operator",
  { pickup: { read: true, write: false } },
  { userRole: "user" }
);
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

const ownerWithTamperedAdminPerms = resolvePermissions(
  "owner",
  {
    update: { read: true, write: true },
    companies: { read: true, write: true },
  },
  { userRole: "user" }
);
assert(
  !canAccess(ownerWithTamperedAdminPerms, "update", "read"),
  "stored admin permissions are stripped for company users"
);

const companyUser = {
  role: "user",
  permissions: ownerWithTamperedAdminPerms,
};
assert(
  !userCanAccess(companyUser, "companies", "read"),
  "userCanAccess blocks admin sections for role=user"
);

const delegatedAdmin = {
  role: "admin",
  permissionsManaged: true,
  permissions: resolvePermissions("operator", {}, {
    permissionsManaged: true,
    userRole: "admin",
  }),
};
assert(
  userCanAccess(
    {
      ...delegatedAdmin,
      permissions: resolvePermissions(
        "operator",
        { update: { read: true, write: true } },
        { permissionsManaged: true, userRole: "admin" }
      ),
    },
    "update",
    "write"
  ),
  "delegated admin can access assigned admin sections"
);

console.log(`Permission tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
