const express = require("express");
const orderRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

// Existing Controllers
const getOrdersByDate = require("../controllers/ordersControllers/getOrdersByDate.controllers");
const getOrdersController = require("../controllers/ordersControllers/getOrders.controllers");
const getAllOrdersController = require("../controllers/ordersControllers/getAllOrders.controllers");
const getSpecificOrderController = require("../controllers/ordersControllers/getSpecificOrder.controllers");
const getOrderByAwbController = require("../controllers/ordersControllers/getOrdersByAwb.controllers");
const createOrderController = require("../controllers/ordersControllers/createOrders.controllers");
const updatePickupLocation = require("../controllers/ordersControllers/updatePickupLoc.controllers");
const updateDeliveryLocation = require("../controllers/ordersControllers/updateDeliveryAddress.controllers");
const updateOrder = require("../controllers/ordersControllers/updateOrder.controllers");
const cancelOrder = require("../controllers/ordersControllers/cancelOrders.controllers");

// ==========================
// Existing Routes
// ==========================
orderRouter.get(
  "/orders/filter",
  checkAuth,
  getOrdersByDate
);

orderRouter.get(
  "/orders",
  checkAuth,
  getOrdersController
);

orderRouter.get(
  "/external/orders",
  checkAuth,
  getAllOrdersController
);

orderRouter.get(
  "/external/orders/:orderId",
  checkAuth,
  getSpecificOrderController
);

orderRouter.get(
  "/orders/awb/:awbNumber",
  checkAuth,
  getOrderByAwbController
);

orderRouter.get(
  "/public/orders/awb/:awbNumber",
  getOrderByAwbController
);

orderRouter.post(
  "/external/orders/create-order",
  checkAuth,
  createOrderController
);

orderRouter.patch(
  "/external/orders/update-pickup-location",
  checkAuth,
  updatePickupLocation
);

orderRouter.post(
  "/external/orders/update-delivery-location",
  checkAuth,
  updateDeliveryLocation
);

orderRouter.post(
  "/external/orders/update-order",
  checkAuth,
  updateOrder
);

orderRouter.post(
  "/external/orders/cancel-order",
  checkAuth,
  cancelOrder
);

module.exports = orderRouter;