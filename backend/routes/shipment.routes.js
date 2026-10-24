const express = require("express");
const shipmentRouter = express.Router();

const cancelShipmentsController = require("../controllers/shipmentControllers/cancelShipments.controllers");
const uploadShipmentPodController = require("../controllers/shipmentControllers/uploadShipmentPod.controllers");
const getShipmentPodUrlController = require("../controllers/shipmentControllers/getShipmentPodUrl.controllers");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const podUpload = require("../middlewares/podUpload.middleware");

shipmentRouter.post(
  "/external/shipments/cancel",
  checkAuth,
  checkPermission("orders", "write"),
  cancelShipmentsController
);

shipmentRouter.post(
  "/admin/shipments/awb/:awbNumber/pod",
  checkAuth,
  checkPermission("update", "write"),
  podUpload.single("pod"),
  uploadShipmentPodController
);

shipmentRouter.get(
  "/shipments/awb/:awbNumber/pod/download-url",
  checkAuth,
  checkPermission("orders", "read"),
  getShipmentPodUrlController
);

module.exports = shipmentRouter;
