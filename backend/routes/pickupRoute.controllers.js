const express = require("express");
const pickupRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

const getUserPickups = require("../controllers/pickupControllers/getAllUserPickupOrders.controllers");
const UserPickupsReschedule = require("../controllers/pickupControllers/userPickupReschedule.controllers");
const UserPickupCancel = require("../controllers/pickupControllers/userCancelPickup.controllers");
const getAdminPickups = require("../controllers/pickupControllers/getAllAdminPickupOrders.controllers");
const UserPickupsComplete = require("../controllers/pickupControllers/adminCompletePickup.controllers");
const UserPickupFailed = require("../controllers/pickupControllers/adminFailPickup.controllers");
const UserPickupsRescheduleExternal = require("../controllers/pickupControllers/userPickupRescheduleExternal.controllers");
const UserPickupCancelExternal = require("../controllers/pickupControllers/userCancelPickupExternal.controllers");

pickupRouter.get(
  "/user/pickups",
  checkAuth,
  getUserPickups
);

pickupRouter.get(
  "/admin/pickups",
  checkAuth,
  getAdminPickups
);

pickupRouter.put(
  "/user/pickups/reschedule",
  checkAuth,
  UserPickupsReschedule
);

pickupRouter.put(
  "/external/user/pickups/reschedule",
  checkAuth,
  UserPickupsRescheduleExternal
);

pickupRouter.put(
  "/admin/pickups/complete",
  checkAuth,
  UserPickupsComplete
);

pickupRouter.put(
  "/user/pickups/cancel",
  checkAuth,
  UserPickupCancel
);

pickupRouter.put(
  "/external/user/pickups/cancel",
  checkAuth,
  UserPickupCancelExternal
);

pickupRouter.put(
  "/admin/pickups/fail",
  checkAuth,
  UserPickupFailed
);



module.exports = pickupRouter;