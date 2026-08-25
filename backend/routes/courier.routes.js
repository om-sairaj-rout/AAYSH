const express = require("express");
const courierRouter = express.Router();

const upload =
  require("../middlewares/upload.middleware");

const {
  checkAuth,
  checkPermission,
} = require("../middlewares/auth.middleware");

const addCourier =
  require("../controllers/courierControllers/addCourier.controller");

const getCouriers =
  require("../controllers/courierControllers/getCouriers.controller");

const uploadAwbSheet =
  require("../controllers/courierControllers/uploadAwbSheet.controller");

const getCouriersExternal =
  require("../controllers/courierControllers/getCourierExternal.controller");

const uploadServiceabilitySheet =
  require("../controllers/courierControllers/uploadServiceability.controller");

const getCourierPriority =
  require("../controllers/courierControllers/getCourierPriority.controller");

const updateCourierPriority =
  require("../controllers/courierControllers/updateCourierPriority.controller");
const updateCourier =
  require("../controllers/courierControllers/updateCourier.controller");
const deleteCourier =
  require("../controllers/courierControllers/deleteCourier.controller");
const getCourierAwbs =
  require("../controllers/courierControllers/getCourierAwbs.controller");
const updateAwb =
  require("../controllers/courierControllers/updateAwb.controller");
const deleteAwb =
  require("../controllers/courierControllers/deleteAwb.controller");


courierRouter.post(
  "/courier/add",
  checkAuth,
  checkPermission("update", "write"),
  addCourier
);

courierRouter.get(
  "/courier/all",
  checkAuth,
  checkPermission("orders", "read"),
  getCouriers
);

courierRouter.get(
  "/external/courier/courierList",
  checkAuth,
  checkPermission("orders", "read"),
  getCouriersExternal
);

courierRouter.post(
  "/awb/upload",
  checkAuth,
  checkPermission("update", "write"),
  upload.single("awbSheet"),
  uploadAwbSheet
);

courierRouter.post(
  "/serviceability/upload",
  checkAuth,
  checkPermission("update", "write"),
  upload.single("serviceabilitySheet"),
  uploadServiceabilitySheet
);

courierRouter.get(
  "/priority/:service",
  checkAuth,
  checkPermission("update", "read"),
  getCourierPriority
);

courierRouter.put(
  "/priority/:service",
  checkAuth,
  checkPermission("update", "write"),
  updateCourierPriority
);

courierRouter.put(
  "/courier/:courierId",
  checkAuth,
  checkPermission("update", "write"),
  updateCourier
);

courierRouter.delete(
  "/courier/:courierId",
  checkAuth,
  checkPermission("update", "write"),
  deleteCourier
);

courierRouter.get(
  "/courier/:courierId/awbs",
  checkAuth,
  checkPermission("update", "read"),
  getCourierAwbs
);

courierRouter.put(
  "/awb/:awbId",
  checkAuth,
  checkPermission("update", "write"),
  updateAwb
);

courierRouter.delete(
  "/awb/:awbId",
  checkAuth,
  checkPermission("update", "write"),
  deleteAwb
);

module.exports = courierRouter;
