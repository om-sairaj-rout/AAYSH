const express = require('express');
const adminStatusUpdateRouter = express.Router();

const updateOrderStatusController = require('../controllers/statusUpdateControllers/updateOrderStatus.controllers.js');
const getOrdersByUserController = require('../controllers/statusUpdateControllers/getOrdersByUser.controllers.js');
const getAllUsers =
require('../controllers/authControllers/getAllUsers.controllers');
const { checkAuth, checkPermission } = require('../middlewares/auth.middleware.js');

adminStatusUpdateRouter.get(
  "/users",
  checkAuth,
  checkPermission("upload", "read"),
  getAllUsers
);
adminStatusUpdateRouter.get(
  "/orders/:userId",
  checkAuth,
  checkPermission("upload", "read"),
  getOrdersByUserController
);
adminStatusUpdateRouter.put(
  "/order/:orderId",
  checkAuth,
  checkPermission("upload", "write"),
  updateOrderStatusController
);


module.exports = adminStatusUpdateRouter;
