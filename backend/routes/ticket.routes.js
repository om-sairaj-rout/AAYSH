const express = require("express");
const ticketRouter = express.Router();
const { checkAuth, authRoles } = require("../middlewares/auth.middleware");
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
  upload.single("attachment"),
  createTicket
);
ticketRouter.get("/tickets", checkAuth, getTickets);
ticketRouter.get("/tickets/unread-count", checkAuth, getUserTicketUnreadCount);
ticketRouter.post("/tickets/:id/messages", checkAuth, addTicketMessage);
ticketRouter.post("/tickets/:id/read", checkAuth, markTicketRead);
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
ticketRouter.get(
  "/admin/tickets/unread-count",
  checkAuth,
  authRoles("admin"),
  getAdminTicketUnreadCount
);
ticketRouter.put(
  "/admin/tickets/:id",
  checkAuth,
  authRoles("admin"),
  updateTicket
);
ticketRouter.post(
  "/admin/tickets/:id/messages",
  checkAuth,
  authRoles("admin"),
  addTicketMessage
);
ticketRouter.post(
  "/admin/tickets/:id/read",
  checkAuth,
  authRoles("admin"),
  markTicketRead
);

module.exports = ticketRouter;
