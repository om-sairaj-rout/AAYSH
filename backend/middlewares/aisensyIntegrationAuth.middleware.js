const { secureCompare } = require("../utils/secureCompare");

const HEADER_NAME = "x-aaysh-integration-key";

const isAisensyIntegrationConfigured = () =>
  Boolean(String(process.env.AISENSY_INTEGRATION_API_KEY || "").trim());

const aisensyIntegrationAuth = (req, res, next) => {
  const configured = String(process.env.AISENSY_INTEGRATION_API_KEY || "").trim();
  if (!configured) {
    return res.status(503).json({
      success: false,
      message: "Integration tracking is temporarily unavailable",
    });
  }

  const provided = String(req.headers[HEADER_NAME] || "").trim();
  if (!provided || !secureCompare(provided, configured)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized integration request",
    });
  }

  return next();
};

module.exports = {
  HEADER_NAME,
  isAisensyIntegrationConfigured,
  aisensyIntegrationAuth,
};