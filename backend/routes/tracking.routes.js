const express = require("express");
const trackingRouter = express.Router();

const trackShipmentController = require("../controllers/trackingControllers/getTrackingByAwb.controllers");
const { checkAuth } = require("../middlewares/auth.middleware");

trackingRouter.get(
  "/aayshExpress/track/:awb",
  checkAuth,
  trackShipmentController
);

module.exports = trackingRouter;