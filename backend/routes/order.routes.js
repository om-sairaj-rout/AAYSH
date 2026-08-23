const express = require("express");
const orderRouter = express.Router();

const {
  checkAuth,
  authRoles,
  checkPermission,
} = require("../middlewares/auth.middleware");

// Existing Controllers
const getOrdersByDate = require("../controllers/ordersControllers/getOrdersByDate.controllers");
const getOrdersController = require("../controllers/ordersControllers/getOrders.controllers");
const getAllOrdersController = require("../controllers/ordersControllers/getAllOrders.controllers");
const getSpecificOrderController = require("../controllers/ordersControllers/getSpecificOrder.controllers");
const getOrderByAwbController = require("../controllers/ordersControllers/getOrdersByAwb.controllers");
const createOrderController = require("../controllers/ordersControllers/createOrders.controllers");
const getOrderDocumentUrlController = require("../controllers/ordersControllers/getOrderDocumentUrl.controllers");
const uploadOrderDocumentsController = require("../controllers/ordersControllers/uploadOrderDocuments.controllers");
const upload = require("../middlewares/upload.middleware");
const {
  getOrderIdSequencesController,
  getNextOrderIdController,
} = require("../controllers/ordersControllers/getNextOrderId.controllers");
const updatePickupLocation = require("../controllers/ordersControllers/updatePickupLoc.controllers");
const updateDeliveryLocation = require("../controllers/ordersControllers/updateDeliveryAddress.controllers");
const updateOrder = require("../controllers/ordersControllers/updateOrder.controllers");
const cancelOrder = require("../controllers/ordersControllers/cancelOrders.controllers");
const getOrdersByUserController = require("../controllers/orderUpdatesControllers/getOrdersByUser.controllers");
const getOrdersByCompanyController = require("../controllers/orderUpdatesControllers/getOrdersByCompany.controllers");

// ==========================
// Existing Routes
// ==========================
orderRouter.get(
  "/orders/filter",
  checkAuth,
  checkPermission("orders", "read"),
  getOrdersByDate
);

orderRouter.get(
  "/orders",
  checkAuth,
  checkPermission("orders", "read"),
  getOrdersController
);

orderRouter.get(
  "/external/orders",
  checkAuth,
  checkPermission("orders", "read"),
  getAllOrdersController
);

orderRouter.get(
  "/external/orders/order-id-sequences",
  checkAuth,
  checkPermission("orders", "read"),
  getOrderIdSequencesController
);

orderRouter.get(
  "/external/orders/next-order-id",
  checkAuth,
  checkPermission("orders", "write"),
  getNextOrderIdController
);

orderRouter.get(
  "/external/orders/:orderId/documents/:documentIndex/url",
  checkAuth,
  checkPermission("orders", "read"),
  getOrderDocumentUrlController
);

orderRouter.post(
  "/external/orders/:orderId/documents",
  checkAuth,
  checkPermission("orders", "write"),
  upload.array("documents", 10),
  uploadOrderDocumentsController
);

orderRouter.get(
  "/external/orders/:orderId",
  checkAuth,
  checkPermission("orders", "read"),
  getSpecificOrderController
);

// Public — anyone with an AWB can track (homepage, /track/:awb, customer portal)
orderRouter.get(
  "/orders/awb/:awbNumber",
  getOrderByAwbController
);

orderRouter.get(
  "/public/orders/awb/:awbNumber",
  getOrderByAwbController
);

orderRouter.post(
  "/external/orders/create-order",
  checkAuth,
  checkPermission("orders", "write"),
  upload.array("documents", 50),
  createOrderController
);

orderRouter.patch(
  "/external/orders/update-pickup-location",
  checkAuth,
  checkPermission("orders", "write"),
  updatePickupLocation
);

orderRouter.post(
  "/external/orders/update-delivery-location",
  checkAuth,
  checkPermission("orders", "write"),
  updateDeliveryLocation
);

orderRouter.post(
  "/external/orders/update-order",
  checkAuth,
  checkPermission("orders", "write"),
  updateOrder
);

orderRouter.post(
  "/external/orders/cancel-order",
  checkAuth,
  checkPermission("orders", "write"),
  cancelOrder
);

orderRouter.get(
  "/users/:userId/orders",
  checkAuth,
  authRoles("admin"),
  getOrdersByUserController
);

orderRouter.get(
  "/companies/:companyID/orders",
  checkAuth,
  authRoles("admin"),
  getOrdersByCompanyController
);

module.exports = orderRouter;