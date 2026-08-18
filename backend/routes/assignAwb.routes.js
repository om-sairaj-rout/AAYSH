const express = require("express");
const assignAwbRouter = express.Router();

const {
  checkAuth,
  checkPermission,
} = require("../middlewares/auth.middleware");

const assignAwbToOrdersController = require(
  "../controllers/assignAWBControllers/assignAwbToOrders.controllers"
);
const assignAwbExternalController = require(
  "../controllers/assignAWBControllers/assignAwbExternal.controllers"
);


// ==========================
// Assign AWB to Orders
// ==========================
assignAwbRouter.post(
  "/shipping/assign-awb",
  checkAuth,
  checkPermission("orders", "write"),
  assignAwbToOrdersController
);

assignAwbRouter.post(
  "/external/shipping/assign-awb",
  checkAuth,
  checkPermission("orders", "write"),
  assignAwbExternalController
);

module.exports = assignAwbRouter;