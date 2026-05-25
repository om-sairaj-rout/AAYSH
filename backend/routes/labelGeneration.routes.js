const express = require('express');
const generateLabelRouter = express.Router();

const generateLabelController = require("../controllers/labelGenerationControllers/generateLabel.controllers.js");

generateLabelRouter.post("/generate-labels", generateLabelController);

module.exports = generateLabelRouter;