const express = require('express');
const orderRouter = express.Router();

const getOrdersByDate = require('../controllers/ordersControllers/getOrdersByDate.controllers.js');
const getOrdersController = require('../controllers/ordersControllers/getOrders.controllers.js');
const getOrderByAwbController = require('../controllers/ordersControllers/getOrdersByAwb.controllers.js');
const { checkAuth } = require('../middlewares/auth.middleware.js');

orderRouter.get('/orders/filter', checkAuth, getOrdersByDate);
orderRouter.get('/orders', checkAuth, getOrdersController);
orderRouter.get('/orders/awb/:awbNumber', getOrderByAwbController);

module.exports = orderRouter;