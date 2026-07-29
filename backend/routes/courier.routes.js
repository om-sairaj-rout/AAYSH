const express = require("express");
const courierRouter = express.Router();

const upload =
  require("../middlewares/upload.middleware");

const {
  checkAuth,
  authRoles,
} = require("../middlewares/auth.middleware");

const addCourier =
  require("../controllers/courierControllers/addCourier.controller");

const getCouriers =
  require("../controllers/courierControllers/getCouriers.controller");

const uploadAwbSheet =
  require("../controllers/courierControllers/uploadAwbSheet.controller");

const getCouriersExternal =
  require("../controllers/courierControllers/getCourierExternal.controllers");


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
  getCouriers
);

courierRouter.get(
  "/external/courier/courierList",
  checkAuth,
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

module.exports = courierRouter;