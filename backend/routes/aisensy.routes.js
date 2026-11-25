const express = require("express");
const aisensyRouter = express.Router();
const aisensyTrack = require("../controllers/integrationsControllers/aisensyTrack.controllers");
const getOrderCompleteDetailsController = require("../controllers/ordersControllers/getOrderCompleteDetails.controllers");
const { aisensyIntegrationAuth } = require("../middlewares/aisensyIntegrationAuth.middleware");
const { aisensyRateLimit } = require("../middlewares/aisensyRateLimit.middleware");

aisensyRouter.post(
  "/public/integrations/aisensy/track",
  aisensyRateLimit,
  aisensyIntegrationAuth,
  aisensyTrack
);

aisensyRouter.get(
  "/external/orders/:orderId/complete-details",
  aisensyRateLimit,
  aisensyIntegrationAuth,
  getOrderCompleteDetailsController
);

module.exports = aisensyRouter;