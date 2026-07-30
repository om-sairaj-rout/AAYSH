const express = require("express");
const shipmentRouter = express.Router();

const getAllShipmentsController = require("../controllers/shipmentControllers/getAllShipment.controllers");
const { checkAuth } = require("../middlewares/auth.middleware");

shipmentRouter.get(
  "/external/shipments",
  checkAuth,
  getAllShipmentsController
);

module.exports = shipmentRouter;