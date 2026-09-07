const { checkPermission } = require("../middlewares/auth.middleware");
const { resolvePermissions, userCanAccess } = require("../utils/permissions");

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

const runMiddleware = (middleware, user) =>
  new Promise((resolve) => {
    const req = { user };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        resolve(this.statusCode);
      },
    };
    middleware(req, res, () => resolve(200));
  });

const viewerUser = {
  role: "user",
  companyRole: "viewer",
  permissions: resolvePermissions("viewer", {}, { userRole: "user" }),
};

const operatorUser = {
  role: "user",
  companyRole: "operator",
  permissions: resolvePermissions("operator", {}, { userRole: "user" }),
};

const ownerUser = {
  role: "user",
  companyRole: "owner",
  permissions: resolvePermissions("owner", {}, { userRole: "user" }),
};

const adminUser = {
  role: "admin",
  permissionsManaged: false,
  permissions: {},
};

(async () => {
  const shipDenied = await runMiddleware(
    checkPermission("orders", "write"),
    viewerUser
  );
  assert(shipDenied === 403, "viewer ship (orders write) returns 403");

  const shipAllowed = await runMiddleware(
    checkPermission("orders", "write"),
    operatorUser
  );
  assert(shipAllowed === 200, "operator ship (orders write) returns 200");

  const adminShip = await runMiddleware(
    checkPermission("orders", "write"),
    adminUser
  );
  assert(adminShip === 200, "admin bypasses permission check");

  const viewerRead = await runMiddleware(
    checkPermission("orders", "read"),
    viewerUser
  );
  assert(viewerRead === 200, "viewer can read orders");

  const viewerReadNotWrite = await runMiddleware(
    checkPermission("orders", "write"),
    {
      role: "user",
      permissions: resolvePermissions(
        "viewer",
        { orders: { read: true, write: false } },
        { userRole: "user" }
      ),
    }
  );
  assert(viewerReadNotWrite === 403, "read-only orders does not allow write");

  const ownerUpdateDenied = await runMiddleware(
    checkPermission("update", "read"),
    ownerUser
  );
  assert(ownerUpdateDenied === 403, "company owner cannot access update APIs");

  const ownerSettingsDenied = await runMiddleware(
    checkPermission("settings", "write"),
    ownerUser
  );
  assert(ownerSettingsDenied === 403, "company owner cannot access settings APIs");

  assert(
    !userCanAccess(ownerUser, "companies", "read"),
    "owner userCanAccess denies companies section"
  );

  console.log(`Middleware tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
