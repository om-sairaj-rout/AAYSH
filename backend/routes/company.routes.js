const express = require("express");
const companyRouter = express.Router();
const { checkAuth, authRoles } = require("../middlewares/auth.middleware");
const getCompanies = require("../controllers/companyControllers/getCompanies.controllers");
const getCompanyDetail = require("../controllers/companyControllers/getCompanyDetail.controllers");
const registerCompanyUser = require("../controllers/companyControllers/registerCompanyUser.controllers");
const updateCompanyUser = require("../controllers/companyControllers/updateCompanyUser.controllers");
const deleteCompanyUser = require("../controllers/companyControllers/deleteCompanyUser.controllers");

companyRouter.get("/companies", checkAuth, authRoles("admin"), getCompanies);
companyRouter.get("/companies/:companyID", checkAuth, getCompanyDetail);
companyRouter.post(
  "/companies/:companyID/users",
  checkAuth,
  registerCompanyUser
);
companyRouter.put(
  "/companies/:companyID/users/:userId",
  checkAuth,
  updateCompanyUser
);
companyRouter.delete(
  "/companies/:companyID/users/:userId",
  checkAuth,
  deleteCompanyUser
);

module.exports = companyRouter;
