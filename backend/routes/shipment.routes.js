const express = require("express");
const shipmentRouter = express.Router();

const cancelShipmentsController = require("../controllers/shipmentControllers/cancelShipments.controllers");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");

shipmentRouter.post(
  "/external/shipments/cancel",
  checkAuth,
  checkPermission("orders", "write"),
  cancelShipmentsController
);

module.exports = shipmentRouter;
