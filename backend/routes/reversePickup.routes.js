const express = require("express");
const reversePickupRouter = express.Router();
const { checkAuth, authRoles, checkPermission } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const createReversePickup = require("../controllers/reversePickupControllers/createReversePickup.controllers");
const getReversePickups = require("../controllers/reversePickupControllers/getReversePickups.controllers");
const approveReversePickup = require("../controllers/reversePickupControllers/approveReversePickup.controllers");
const rejectReversePickup = require("../controllers/reversePickupControllers/rejectReversePickup.controllers");
const getReversePickupDocumentUrl = require("../controllers/reversePickupControllers/getReversePickupDocumentUrl.controllers");
const getReversePickupDocumentByOrder = require("../controllers/reversePickupControllers/getReversePickupDocumentByOrder.controllers");
const searchReversePickupCustomers = require("../controllers/reversePickupControllers/searchReversePickupCustomers.controllers");

reversePickupRouter.post(
  "/reverse-pickups",
  checkAuth,
  checkPermission("pickup", "write"),
  upload.single("supportingDocument"),
  createReversePickup
);
reversePickupRouter.get(
  "/reverse-pickups",
  checkAuth,
  checkPermission("pickup", "read"),
  getReversePickups
);
reversePickupRouter.get(
  "/reverse-pickups/customers/search",
  checkAuth,
  checkPermission("pickup", "read"),
  searchReversePickupCustomers
);
reversePickupRouter.get(
  "/reverse-pickups/order/:orderId/document-url",
  checkAuth,
  checkPermission("pickup", "read"),
  getReversePickupDocumentByOrder
);
reversePickupRouter.get(
  "/reverse-pickups/:id/document-url",
  checkAuth,
  checkPermission("pickup", "read"),
  getReversePickupDocumentUrl
);
reversePickupRouter.put(
  "/admin/reverse-pickups/:id/approve",
  checkAuth,
  authRoles("admin"),
  approveReversePickup
);
reversePickupRouter.put(
  "/admin/reverse-pickups/:id/reject",
  checkAuth,
  authRoles("admin"),
  rejectReversePickup
);

module.exports = reversePickupRouter;
