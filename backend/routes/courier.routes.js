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

courierRouter.put(
  "/courier/:courierId",
  checkAuth,
  authRoles("admin"),
  updateCourier
);

courierRouter.delete(
  "/courier/:courierId",
  checkAuth,
  authRoles("admin"),
  deleteCourier
);

courierRouter.get(
  "/courier/:courierId/awbs",
  checkAuth,
  authRoles("admin"),
  getCourierAwbs
);

courierRouter.put(
  "/awb/:awbId",
  checkAuth,
  authRoles("admin"),
  updateAwb
);

courierRouter.delete(
  "/awb/:awbId",
  checkAuth,
  authRoles("admin"),
  deleteAwb
);

module.exports = courierRouter;