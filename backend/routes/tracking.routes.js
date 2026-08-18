const express = require("express");
const trackingRouter = express.Router();

const getTrackingByAwbController = require("../controllers/trackingControllers/getTrackingByAwb.controllers");
const getTrackingByOrderIdController = require("../controllers/trackingControllers/getTrackingByOrderId.controllers");
const getTrackingByShipmentIdController = require("../controllers/trackingControllers/getTrackingByShipmentId.controllers");
const trackMultipleShipmentController = require("../controllers/trackingControllers/getTrackingByMultipleAwb.controllers");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");

trackingRouter.get(
  "/track/awb/:awb",
  checkAuth,
  checkPermission("orders", "read"),
  getTrackingByAwbController
);

trackingRouter.post(
  "/track/multiple",
  checkAuth,
  checkPermission("orders", "read"),
  trackMultipleShipmentController
);

trackingRouter.get(
  "/track/shipment/:shipmentId",
  checkAuth,
  checkPermission("shipments", "read"),
  getTrackingByShipmentIdController
);

trackingRouter.get(
  "/track/order/:orderId",
  checkAuth,
  checkPermission("orders", "read"),
  getTrackingByOrderIdController
);

module.exports = trackingRouter;