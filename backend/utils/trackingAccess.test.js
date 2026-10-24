const assert = require("assert");

const mockReq = (user) => ({ user });

const userOwnsOrder = (order, req) => {
  if (req.user?.role === "admin") return true;
  if (req.user?.companyID && order?.companyID) {
    return order.companyID === req.user.companyID;
  }
  return String(order?.uploadedBy) === String(req.user?.id);
};

assert.strictEqual(
  userOwnsOrder({ companyID: "AAYSH-000001" }, mockReq({ role: "user", companyID: "AAYSH-000001" })),
  true
);
assert.strictEqual(
  userOwnsOrder({ companyID: "AAYSH-000002" }, mockReq({ role: "user", companyID: "AAYSH-000001" })),
  false
);
assert.strictEqual(
  userOwnsOrder({ companyID: "AAYSH-000002" }, mockReq({ role: "admin" })),
  true
);

console.log("trackingAccess.test.js: all assertions passed");
