const express = require("express");
const pickupScheduleRouter = express.Router();
const upload = require("../middlewares/upload.middleware");
const {
  checkAuth,
  checkPermission,
  checkAnyPermission,
} = require("../middlewares/auth.middleware");

const createPickupSchedule = require("../controllers/pickupScheduleControllers/createPickupSchedule.controllers");
const getPickupSchedules = require("../controllers/pickupScheduleControllers/getPickupSchedules.controllers");
const cancelPickupSchedule = require("../controllers/pickupScheduleControllers/cancelPickupSchedule.controllers");
const reschedulePickupSchedule = require("../controllers/pickupScheduleControllers/reschedulePickupSchedule.controllers");
const completePickupSchedule = require("../controllers/pickupScheduleControllers/completePickupSchedule.controllers");

pickupScheduleRouter.post(
  "/pickup-schedules",
  checkAuth,
  checkPermission("pickup", "write"),
  createPickupSchedule
);

pickupScheduleRouter.get(
  "/pickup-schedules",
  checkAuth,
  checkPermission("pickup", "read"),
  getPickupSchedules
);

pickupScheduleRouter.put(
  "/pickup-schedules/:id/cancel",
  checkAuth,
  checkPermission("pickup", "write"),
  cancelPickupSchedule
);

pickupScheduleRouter.put(
  "/pickup-schedules/:id/reschedule",
  checkAuth,
  checkPermission("pickup", "write"),
  reschedulePickupSchedule
);

pickupScheduleRouter.post(
  "/pickup-schedules/:id/complete",
  checkAuth,
  checkAnyPermission(["pickup", "orders"], "write"),
  upload.array("documents"),
  completePickupSchedule
);

module.exports = pickupScheduleRouter;
