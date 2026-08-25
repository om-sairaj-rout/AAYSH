const express = require("express");
const companyRouter = express.Router();
const {
  checkAuth,
  checkPermission,
  checkAnyPermission,
  requireUnrestrictedAdmin,
} = require("../middlewares/auth.middleware");
const getCompanies = require("../controllers/companyControllers/getCompanies.controllers");
const getCompanyDetail = require("../controllers/companyControllers/getCompanyDetail.controllers");
const registerCompanyUser = require("../controllers/companyControllers/registerCompanyUser.controllers");
const updateCompanyUser = require("../controllers/companyControllers/updateCompanyUser.controllers");
const deleteCompanyUser = require("../controllers/companyControllers/deleteCompanyUser.controllers");
const deleteCompany = require("../controllers/companyControllers/deleteCompany.controllers");

companyRouter.get(
  "/companies",
  checkAuth,
  checkPermission("companies", "read"),
  getCompanies
);
companyRouter.get(
  "/companies/:companyID",
  checkAuth,
  checkAnyPermission(["team", "companies"], "read"),
  getCompanyDetail
);
companyRouter.post(
  "/companies/:companyID/users",
  checkAuth,
  checkPermission("team", "write"),
  registerCompanyUser
);
companyRouter.put(
  "/companies/:companyID/users/:userId",
  checkAuth,
  checkPermission("team", "write"),
  updateCompanyUser
);
companyRouter.delete(
  "/companies/:companyID",
  checkAuth,
  requireUnrestrictedAdmin,
  deleteCompany
);
companyRouter.delete(
  "/companies/:companyID/users/:userId",
  checkAuth,
  checkPermission("team", "write"),
  deleteCompanyUser
);

module.exports = companyRouter;
