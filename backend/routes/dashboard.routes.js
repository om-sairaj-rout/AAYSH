const express = require('express');
const dashboardRouter = express.Router();

const { checkAuth } = require('../middlewares/auth.middleware.js');
const getDashboardController = require('../controllers/dashboardControllers/getDashBoard.controllers.js');

dashboardRouter.get("/dashboard", checkAuth, getDashboardController );

module.exports = dashboardRouter;