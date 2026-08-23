const express = require("express");
const companyRouter = express.Router();
const { checkAuth, authRoles, checkPermission } = require("../middlewares/auth.middleware");
const getCompanies = require("../controllers/companyControllers/getCompanies.controllers");
const getCompanyDetail = require("../controllers/companyControllers/getCompanyDetail.controllers");
const registerCompanyUser = require("../controllers/companyControllers/registerCompanyUser.controllers");
const updateCompanyUser = require("../controllers/companyControllers/updateCompanyUser.controllers");
const deleteCompanyUser = require("../controllers/companyControllers/deleteCompanyUser.controllers");
const deleteCompany = require("../controllers/companyControllers/deleteCompany.controllers");

companyRouter.get("/companies", checkAuth, authRoles("admin"), getCompanies);
companyRouter.get(
  "/companies/:companyID",
  checkAuth,
  checkPermission("team", "read"),
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
  authRoles("admin"),
  deleteCompany
);
companyRouter.delete(
  "/companies/:companyID/users/:userId",
  checkAuth,
  checkPermission("team", "write"),
  deleteCompanyUser
);

module.exports = companyRouter;
