const express = require("express");
const pickupRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

const getUserPickups = require("../controllers/pickupControllers/getAllUserPickupOrders.controllers");
const UserPickupsReschedule = require("../controllers/pickupControllers/userPickupReschedule.controllers");
const UserPickupCancel = require("../controllers/pickupControllers/userCancelPickup.controllers");
const getAdminPickups = require("../controllers/pickupControllers/getAllAdminPickupOrders.controllers");

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
  "/admin/pickups/fail",
  checkAuth,
  UserPickupFailed
);



module.exports = pickupRouter;