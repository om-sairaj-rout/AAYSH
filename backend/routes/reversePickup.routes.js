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
  checkPermission("reversePickup", "write"),
  upload.single("supportingDocument"),
  createReversePickup
);
reversePickupRouter.get(
  "/reverse-pickups",
  checkAuth,
  checkPermission("reversePickup", "read"),
  getReversePickups
);
reversePickupRouter.get(
  "/reverse-pickups/customers/search",
  checkAuth,
  checkPermission("reversePickup", "read"),
  searchReversePickupCustomers
);
reversePickupRouter.get(
  "/reverse-pickups/order/:orderId/document-url",
  checkAuth,
  checkPermission("reversePickup", "read"),
  getReversePickupDocumentByOrder
);
reversePickupRouter.get(
  "/reverse-pickups/:id/document-url",
  checkAuth,
  checkPermission("reversePickup", "read"),
  getReversePickupDocumentUrl
);
reversePickupRouter.put(
  "/admin/reverse-pickups/:id/approve",
  checkAuth,
  checkPermission("reversePickup", "write"),
  approveReversePickup
);
reversePickupRouter.put(
  "/admin/reverse-pickups/:id/reject",
  checkAuth,
  checkPermission("reversePickup", "write"),
  rejectReversePickup
);

module.exports = reversePickupRouter;
