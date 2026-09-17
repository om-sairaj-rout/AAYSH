const express = require("express");
const rateRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const {
  getRateStructure,
  getAllRateStructures,
} = require("../controllers/rateControllers/getRateStructure.controller");
const updateRateStructure = require("../controllers/rateControllers/updateRateStructure.controller");
const calculateRateController = require("../controllers/rateControllers/calculateRate.controller");
const lookupPincodeZone = require("../controllers/rateControllers/lookupPincodeZone.controller");

rateRouter.post(
  "/rates/calculate",
  checkAuth,
  checkPermission("orders", "read"),
  calculateRateController
);

rateRouter.get(
  "/rates/pincode/:pincode",
  checkAuth,
  checkPermission("orders", "read"),
  lookupPincodeZone
);

rateRouter.get(
  "/rates",
  checkAuth,
  checkPermission("orders", "read"),
  getAllRateStructures
);

rateRouter.get(
  "/rates/:service",
  checkAuth,
  checkPermission("orders", "read"),
  getRateStructure
);

rateRouter.put(
  "/rates/:service",
  checkAuth,
  checkPermission("update", "write"),
  updateRateStructure
);

module.exports = rateRouter;
