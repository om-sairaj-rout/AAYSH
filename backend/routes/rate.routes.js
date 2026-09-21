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
const {
  getCompanyRateProfileController,
  updateCompanyRateProfileController,
} = require("../controllers/rateControllers/companyRateProfile.controller");
const {
  getCompanyRateStructureController,
  updateCompanyRateStructureController,
} = require("../controllers/rateControllers/companyRateStructure.controller");

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
  "/rates/company/:companyID/profile",
  checkAuth,
  checkPermission("update", "read"),
  getCompanyRateProfileController
);

rateRouter.put(
  "/rates/company/:companyID/profile",
  checkAuth,
  checkPermission("update", "write"),
  updateCompanyRateProfileController
);

rateRouter.get(
  "/rates/company/:companyID/:service",
  checkAuth,
  checkPermission("update", "read"),
  getCompanyRateStructureController
);

rateRouter.put(
  "/rates/company/:companyID/:service",
  checkAuth,
  checkPermission("update", "write"),
  updateCompanyRateStructureController
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
