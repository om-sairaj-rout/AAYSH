const express = require("express");
const trackingRouter = express.Router();

const getTrackingByAwbController = require("../controllers/trackingControllers/getTrackingByAwb.controllers");
const getTrackingByOrderIdController = require("../controllers/trackingControllers/getTrackingByOrderId.controllers");
const getTrackingByShipmentIdController = require("../controllers/trackingControllers/getTrackingByShipmentId.controllers");
const trackMultipleShipmentController = require("../controllers/trackingControllers/getTrackingByMultipleAwb.controllers");
const { checkAuth } = require("../middlewares/auth.middleware");

trackingRouter.get(
  "/track/awb/:awb",
  checkAuth,
  getTrackingByAwbController
);

trackingRouter.post(
  "/track/multiple",
  checkAuth,
  trackMultipleShipmentController
);

trackingRouter.get(
  "/track/shipment/:shipmentId",
  checkAuth,
  getTrackingByShipmentIdController
);

trackingRouter.get(
  "/track/order/:orderId",
  checkAuth,
  getTrackingByOrderIdController
);

module.exports = trackingRouter;