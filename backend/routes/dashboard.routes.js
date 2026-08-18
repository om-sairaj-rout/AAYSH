const express = require('express');
const dashboardRouter = express.Router();

const { checkAuth, checkPermission } = require('../middlewares/auth.middleware.js');
const getDashboardController = require('../controllers/dashboardControllers/getDashBoard.controllers.js');

dashboardRouter.get(
  "/dashboard",
  checkAuth,
  checkPermission("dashboard", "read"),
  getDashboardController
);

module.exports = dashboardRouter;