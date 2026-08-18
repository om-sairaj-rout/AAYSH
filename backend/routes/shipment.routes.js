const express = require("express");
const shipmentRouter = express.Router();

const getAllShipmentsController = require("../controllers/shipmentControllers/getAllShipment.controllers");
const cancelShipmentsController = require("../controllers/shipmentControllers/cancelShipments.controllers");
const getSpecificShipmentController = require("../controllers/shipmentControllers/getSpecificShipment.controllers");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");

shipmentRouter.get(
  "/external/shipments",
  checkAuth,
  checkPermission("shipments", "read"),
  getAllShipmentsController
);

shipmentRouter.get(
  "/external/shipments/:shipmentId",
  checkAuth,
  checkPermission("shipments", "read"),
  getSpecificShipmentController
);

shipmentRouter.post(
  "/external/shipments/cancel",
  checkAuth,
  checkPermission("shipments", "write"),
  cancelShipmentsController
);

module.exports = shipmentRouter;