const express = require('express');
const generateLabelRouter = express.Router();

const generateLabelController = require("../controllers/labelGenerationControllers/generateLabel.controllers.js");
const generateInvoiceController = require("../controllers/labelGenerationControllers/generateInvoice.controllers.js");
const generateManifestController = require("../controllers/labelGenerationControllers/generateManifest.controllers.js");
const generateLabelExternalController = require("../controllers/labelGenerationControllers/generateLabelExternal.controllers.js");
const generateInvoiceExternalController = require("../controllers/labelGenerationControllers/generateInvoiceExternal.controllers.js");
const generateManifestExternalController = require("../controllers/labelGenerationControllers/generateManifest.controllers.js");

generateLabelRouter.post("/pdf/labels", generateLabelController);
generateLabelRouter.post("/pdf/invoices", generateInvoiceController);
generateLabelRouter.post("/pdf/manifests", generateManifestController);
generateLabelRouter.post("/external/pdf/labels", generateLabelExternalController);
generateLabelRouter.post("/external/pdf/invoices", generateInvoiceExternalController);
generateLabelRouter.post("/external/pdf/manifests", generateManifestExternalController);

module.exports = generateLabelRouter;