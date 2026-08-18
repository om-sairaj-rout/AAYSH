const express = require("express");
const pickupRouter = express.Router();

const {
  checkAuth,
  authRoles,
  checkPermission,
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
  checkPermission("pickup", "read"),
  getUserPickups
);

pickupRouter.get(
  "/admin/pickups",
  checkAuth,
  authRoles("admin"),
  getAdminPickups
);

pickupRouter.put(
  "/user/pickups/reschedule",
  checkAuth,
  checkPermission("pickup", "write"),
  UserPickupsReschedule
);

pickupRouter.put(
  "/external/user/pickups/reschedule",
  checkAuth,
  checkPermission("pickup", "write"),
  UserPickupsRescheduleExternal
);

pickupRouter.put(
  "/admin/pickups/complete",
  checkAuth,
  authRoles("admin"),
  UserPickupsComplete
);

pickupRouter.put(
  "/user/pickups/cancel",
  checkAuth,
  checkPermission("pickup", "write"),
  UserPickupCancel
);

pickupRouter.put(
  "/external/user/pickups/cancel",
  checkAuth,
  checkPermission("pickup", "write"),
  UserPickupCancelExternal
);

pickupRouter.put(
  "/admin/pickups/fail",
  checkAuth,
  authRoles("admin"),
  UserPickupFailed
);



module.exports = pickupRouter;