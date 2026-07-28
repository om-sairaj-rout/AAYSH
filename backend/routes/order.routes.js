const express = require("express");
const orderRouter = express.Router();

const {
  checkAuth,
} = require("../middlewares/auth.middleware");

// Existing Controllers
const getOrdersByDate = require("../controllers/ordersControllers/getOrdersByDate.controllers");
const getOrdersController = require("../controllers/ordersControllers/getOrders.controllers");
const getOrderByAwbController = require("../controllers/ordersControllers/getOrdersByAwb.controllers");
const createOrderController = require("../controllers/ordersControllers/createOrders.controllers");

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
  "/orders/awb/:awbNumber",
  checkAuth,
  getOrderByAwbController
);


orderRouter.post(
  "/orders/create-order",
  checkAuth,
  createOrderController
);

// Update Shiprocket Order
// POST /api/shiprocket/update-order
// const updateShiprocketOrder = require("../controllers/shiprocket/updateOrder.controller");
// orderRouter.post(
//   "/shiprocket/update-order",
//   checkAuth,
//   updateShiprocketOrder
// );

// Track Shipment
// GET /api/shiprocket/track/:awb
// const trackShipment = require("../controllers/shiprocket/trackShipment.controller");
// orderRouter.get(
//   "/shiprocket/track/:awb",
//   checkAuth,
//   trackShipment
// );

module.exports = orderRouter;