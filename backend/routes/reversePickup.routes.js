const express = require("express");
const reversePickupRouter = express.Router();
const { checkAuth, authRoles } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const createReversePickup = require("../controllers/reversePickupControllers/createReversePickup.controllers");
const getReversePickups = require("../controllers/reversePickupControllers/getReversePickups.controllers");
const approveReversePickup = require("../controllers/reversePickupControllers/approveReversePickup.controllers");
const rejectReversePickup = require("../controllers/reversePickupControllers/rejectReversePickup.controllers");
const getReversePickupDocumentUrl = require("../controllers/reversePickupControllers/getReversePickupDocumentUrl.controllers");
const getReversePickupDocumentByOrder = require("../controllers/reversePickupControllers/getReversePickupDocumentByOrder.controllers");

reversePickupRouter.post(
  "/reverse-pickups",
  checkAuth,
  upload.single("supportingDocument"),
  createReversePickup
);
reversePickupRouter.get("/reverse-pickups", checkAuth, getReversePickups);
reversePickupRouter.get(
  "/reverse-pickups/order/:orderId/document-url",
  checkAuth,
  getReversePickupDocumentByOrder
);
reversePickupRouter.get(
  "/reverse-pickups/:id/document-url",
  checkAuth,
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
