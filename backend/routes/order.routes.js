const express = require('express');
const orderRouter = express.Router();

const getOrdersByDate = require('../controllers/ordersControllers/getOrdersByDate.controllers.js');
const { checkAuth } = require('../middlewares/auth.middleware.js');

orderRouter.get('/orders/filter', checkAuth, getOrdersByDate);

module.exports = orderRouter;