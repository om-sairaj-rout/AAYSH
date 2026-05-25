const express = require('express');
const assignAwbRouter = express.Router();

const assignAwbToOrdersController = require("../controllers/assignAWBControllers/assignAwbToOrders.controllers.js");

assignAwbRouter.post("/shipping/assign-awb", assignAwbToOrdersController);

module.exports = assignAwbRouter;