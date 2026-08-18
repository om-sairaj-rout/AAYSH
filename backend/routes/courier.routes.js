const express = require("express");
const courierRouter = express.Router();

const upload =
  require("../middlewares/upload.middleware");

const {
  checkAuth,
  authRoles,
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


// ==========================
// ADD COURIER
// ==========================
courierRouter.post(
  "/courier/add",
  checkAuth,
  authRoles("admin"),
  addCourier
);

// ==========================
// GET ALL COURIERS + COUNTS
// ==========================
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

// ==========================
// UPLOAD AWB SHEET
// field name = awbSheet
// ==========================
courierRouter.post(
  "/awb/upload",
  checkAuth,
  authRoles("admin"),
  upload.single("awbSheet"),
  uploadAwbSheet
);

courierRouter.post(
  "/serviceability/upload",
  checkAuth,
  authRoles("admin"),
  upload.single("serviceabilitySheet"),
  uploadServiceabilitySheet
);

courierRouter.get(
  "/priority/:service",
  checkAuth,
  authRoles("admin"),
  getCourierPriority
);

courierRouter.put(
  "/priority/:service",
  checkAuth,
  authRoles("admin"),
  updateCourierPriority
);

module.exports = courierRouter;