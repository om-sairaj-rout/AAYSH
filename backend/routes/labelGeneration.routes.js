const express = require('express');
const generateLabelRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");

const generateLabelController = require("../controllers/labelGenerationControllers/generateLabel.controllers.js");
const generateInvoiceController = require("../controllers/labelGenerationControllers/generateInvoice.controllers.js");
const generateManifestController = require("../controllers/labelGenerationControllers/generateManifest.controllers.js");
const generateLabelExternalController = require("../controllers/labelGenerationControllers/generateLabelExternal.controllers.js");
const generateInvoiceExternalController = require("../controllers/labelGenerationControllers/generateInvoiceExternal.controllers.js");
const generateManifestExternalController = require("../controllers/labelGenerationControllers/generateManifestExternal.controllers.js");

generateLabelRouter.post(
  "/pdf/labels",
  checkAuth,
  checkPermission("shipments", "read"),
  generateLabelController
);
generateLabelRouter.post(
  "/pdf/invoices",
  checkAuth,
  checkPermission("shipments", "read"),
  generateInvoiceController
);
generateLabelRouter.post(
  "/pdf/manifests",
  checkAuth,
  checkPermission("shipments", "read"),
  generateManifestController
);
generateLabelRouter.post(
  "/external/pdf/labels",
  checkAuth,
  checkPermission("shipments", "read"),
  generateLabelExternalController
);
generateLabelRouter.post(
  "/external/pdf/invoices",
  checkAuth,
  checkPermission("shipments", "read"),
  generateInvoiceExternalController
);
generateLabelRouter.post(
  "/external/pdf/manifests",
  checkAuth,
  checkPermission("shipments", "read"),
  generateManifestExternalController
);

module.exports = generateLabelRouter;