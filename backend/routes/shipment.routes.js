const express = require("express");
const shipmentRouter = express.Router();

const cancelShipmentsController = require("../controllers/shipmentControllers/cancelShipments.controllers");
const getExternalShipmentsController = require("../controllers/shipmentControllers/getExternalShipments.controllers");
const getExternalShipmentByIdController = require("../controllers/shipmentControllers/getExternalShipmentById.controllers");
const uploadShipmentPodController = require("../controllers/shipmentControllers/uploadShipmentPod.controllers");
const getShipmentPodUrlController = require("../controllers/shipmentControllers/getShipmentPodUrl.controllers");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const podUpload = require("../middlewares/podUpload.middleware");

shipmentRouter.get(
  "/external/shipments",
  checkAuth,
  checkPermission("orders", "read"),
  getExternalShipmentsController
);

shipmentRouter.get(
  "/external/shipments/:shipmentId",
  checkAuth,
  checkPermission("orders", "read"),
  getExternalShipmentByIdController
);

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
