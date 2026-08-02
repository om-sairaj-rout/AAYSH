const express = require("express");
const pickupRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

const getUserPickups = require("../controllers/pickupControllers/getAllUserPickupOrders.controllers");
const UserPickupsReschedule = require("../controllers/pickupControllers/userPickupReschedule.controllers");

pickupRouter.get(
  "/user/pickups",
  checkAuth,
  getUserPickups
);

pickupRouter.post(
  "/user/pickups/reschedule",
  checkAuth,
  UserPickupsReschedule
);



module.exports = pickupRouter;