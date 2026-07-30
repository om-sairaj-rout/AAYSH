const express = require('express');
const generateLabelRouter = express.Router();

const generateLabelController = require("../controllers/labelGenerationControllers/generateLabel.controllers.js");
const generateInvoiceController = require("../controllers/labelGenerationControllers/generateInvoice.controllers.js");
const generateManifestController = require("../controllers/labelGenerationControllers/generateManifest.controllers.js");

generateLabelRouter.post("/generate-labels", generateLabelController);
generateLabelRouter.post("/generate-invoice", generateInvoiceController);
generateLabelRouter.post("/generate-manifest", generateManifestController);

module.exports = generateLabelRouter;