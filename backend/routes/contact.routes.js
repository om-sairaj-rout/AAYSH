const express = require("express");
const contactRouter = express.Router();

const contactFormController = require("../controllers/contactControllers/contact.controllers");

contactRouter.post(
  "/contact",
  contactFormController
);

module.exports = contactRouter;