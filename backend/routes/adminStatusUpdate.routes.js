const express = require('express');
const adminStatusUpdateRouter = express.Router();

const updateOrderStatusController = require('../controllers/statusUpdateControllers/updateOrderStatus.controllers.js');
const getOrdersByUserController = require('../controllers/statusUpdateControllers/getOrdersByUser.controllers.js');
const getAllUsers =
require('../controllers/authControllers/getAllUsers.controllers');
const { checkAuth, authRoles } = require('../middlewares/auth.middleware.js');

adminStatusUpdateRouter.get(
  "/users",
  checkAuth,
  authRoles("admin"),
  getAllUsers
);
adminStatusUpdateRouter.get(
  "/orders/:userId",
  checkAuth,
  authRoles("admin"),
  getOrdersByUserController
);
adminStatusUpdateRouter.put(
  "/order/:orderId",
  checkAuth,
  authRoles("admin"),
  updateOrderStatusController
);


module.exports = adminStatusUpdateRouter;