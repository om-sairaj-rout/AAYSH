const express = require("express");
const assignAwbRouter = express.Router();

const {
  checkAuth,
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
  assignAwbToOrdersController
);

assignAwbRouter.post(
  "/external/shipping/assign-awb",
  checkAuth,
  assignAwbExternalController
);

module.exports = assignAwbRouter;