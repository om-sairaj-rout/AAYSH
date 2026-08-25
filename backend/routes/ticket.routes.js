const express = require("express");
const ticketRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const createTicket = require("../controllers/ticketControllers/createTicket.controllers");
const getTickets = require("../controllers/ticketControllers/getTickets.controllers");
const getAdminTickets = require("../controllers/ticketControllers/getAdminTickets.controllers");
const updateTicket = require("../controllers/ticketControllers/updateTicket.controllers");
const addTicketMessage = require("../controllers/ticketControllers/addTicketMessage.controllers");
const markTicketRead = require("../controllers/ticketControllers/markTicketRead.controllers");
const {
  getUserTicketUnreadCount,
  getAdminTicketUnreadCount,
} = require("../controllers/ticketControllers/getTicketUnreadCount.controllers");
const getTicketAttachmentUrl = require("../controllers/ticketControllers/getTicketAttachmentUrl.controllers");

ticketRouter.post(
  "/tickets",
  checkAuth,
  checkPermission("support", "write"),
  upload.single("attachment"),
  createTicket
);
ticketRouter.get("/tickets", checkAuth, checkPermission("support", "read"), getTickets);
ticketRouter.get(
  "/tickets/unread-count",
  checkAuth,
  checkPermission("support", "read"),
  getUserTicketUnreadCount
);
ticketRouter.post(
  "/tickets/:id/messages",
  checkAuth,
  checkPermission("support", "write"),
  addTicketMessage
);
ticketRouter.post(
  "/tickets/:id/read",
  checkAuth,
  checkPermission("support", "read"),
  markTicketRead
);
ticketRouter.get(
  "/tickets/:id/attachment-url",
  checkAuth,
  checkPermission("support", "read"),
  getTicketAttachmentUrl
);
ticketRouter.get(
  "/admin/tickets",
  checkAuth,
  checkPermission("tickets", "read"),
  getAdminTickets
);
ticketRouter.get(
  "/admin/tickets/unread-count",
  checkAuth,
  checkPermission("tickets", "read"),
  getAdminTicketUnreadCount
);
ticketRouter.put(
  "/admin/tickets/:id",
  checkAuth,
  checkPermission("tickets", "write"),
  updateTicket
);
ticketRouter.post(
  "/admin/tickets/:id/messages",
  checkAuth,
  checkPermission("tickets", "write"),
  addTicketMessage
);
ticketRouter.post(
  "/admin/tickets/:id/read",
  checkAuth,
  checkPermission("tickets", "read"),
  markTicketRead
);

module.exports = ticketRouter;
