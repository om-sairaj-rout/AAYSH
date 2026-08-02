const express = require("express");
const pickupRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

const getUserPickups = require("../controllers/pickupControllers/getAllUserPickupOrders.controllers");
const UserPickupsReschedule = require("../controllers/pickupControllers/userPickupReschedule.controllers");
const UserPickupCancel = require("../controllers/pickupControllers/userCancelPickup.controllers");

pickupRouter.get(
  "/user/pickups",
  checkAuth,
  getUserPickups
);

pickupRouter.put(
  "/user/pickups/reschedule",
  checkAuth,
  UserPickupsReschedule
);

pickupRouter.put(
  "/user/pickups/cancel",
  checkAuth,
  UserPickupCancel
);



module.exports = pickupRouter;