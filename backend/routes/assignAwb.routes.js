const express = require("express");
const assignAwbRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

const assignAwbToOrdersController = require(
  "../controllers/assignAWBControllers/assignAwbToOrders.controllers"
);

// ==========================
// Assign AWB to Orders
// ==========================
assignAwbRouter.post(
  "/shipping/assign-awb",
  checkAuth,
  assignAwbToOrdersController
);

module.exports = assignAwbRouter;