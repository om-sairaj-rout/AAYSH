const express = require("express");
const ticketRouter = express.Router();
const { checkAuth, authRoles } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const createTicket = require("../controllers/ticketControllers/createTicket.controllers");
const getTickets = require("../controllers/ticketControllers/getTickets.controllers");
const getAdminTickets = require("../controllers/ticketControllers/getAdminTickets.controllers");
const updateTicket = require("../controllers/ticketControllers/updateTicket.controllers");
const getTicketAttachmentUrl = require("../controllers/ticketControllers/getTicketAttachmentUrl.controllers");

ticketRouter.post(
  "/tickets",
  checkAuth,
  upload.single("attachment"),
  createTicket
);
ticketRouter.get("/tickets", checkAuth, getTickets);
ticketRouter.get(
  "/tickets/:id/attachment-url",
  checkAuth,
  getTicketAttachmentUrl
);
ticketRouter.get(
  "/admin/tickets",
  checkAuth,
  authRoles("admin"),
  getAdminTickets
);
ticketRouter.put(
  "/admin/tickets/:id",
  checkAuth,
  authRoles("admin"),
  updateTicket
);

module.exports = ticketRouter;
