const express = require("express");
const shipmentRouter = express.Router();

const getAllShipmentsController = require("../controllers/shipmentControllers/getAllShipment.controllers");
const cancelShipmentsController = require("../controllers/shipmentControllers/cancelShipments.controllers");
const getSpecificShipmentController = require("../controllers/shipmentControllers/getSpecificShipment.controllers");
const { checkAuth } = require("../middlewares/auth.middleware");

shipmentRouter.get(
  "/external/shipments",
  checkAuth,
  getAllShipmentsController
);

shipmentRouter.get(
  "/external/shipments/:shipmentId",
  checkAuth,
  getSpecificShipmentController
);

shipmentRouter.post(
  "/external/shipments/cancel",
  checkAuth,
  cancelShipmentsController
);

module.exports = shipmentRouter;