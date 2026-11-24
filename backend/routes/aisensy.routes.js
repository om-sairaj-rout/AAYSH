const express = require("express");
const aisensyRouter = express.Router();
const aisensyTrack = require("../controllers/integrationsControllers/aisensyTrack.controllers");
const { aisensyIntegrationAuth } = require("../middlewares/aisensyIntegrationAuth.middleware");
const { aisensyRateLimit } = require("../middlewares/aisensyRateLimit.middleware");

aisensyRouter.post(
  "/public/integrations/aisensy/track",
  aisensyRateLimit,
  aisensyIntegrationAuth,
  aisensyTrack
);

module.exports = aisensyRouter;