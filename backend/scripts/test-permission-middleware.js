const { checkPermission } = require("../middlewares/auth.middleware");
const { resolvePermissions } = require("../utils/permissions");

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
  permissions: resolvePermissions("viewer", {}),
};

const operatorUser = {
  role: "user",
  companyRole: "operator",
  permissions: resolvePermissions("operator", {}),
};

const adminUser = {
  role: "admin",
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
      permissions: resolvePermissions("viewer", {
        orders: { read: true, write: false },
      }),
    }
  );
  assert(viewerReadNotWrite === 403, "read-only orders does not allow write");

  console.log(`Middleware tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
