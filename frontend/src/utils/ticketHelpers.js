export const TICKET_UNREAD_CHANGED_EVENT = "ticket-unread-changed";

export const notifyTicketUnreadChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TICKET_UNREAD_CHANGED_EVENT));
  }
};

export const ticketHasAdminReply = (ticket) => {
  if (!ticket) return false;
  const hasThreadReply = (ticket.messages || []).some(
    (entry) => entry.senderRole === "admin"
  );
  return hasThreadReply || Boolean(String(ticket.adminReply || "").trim());
};

export const canUserReplyToTicket = (ticket) => {
  if (!ticket || ticket.status === "resolved") return false;
  return ticketHasAdminReply(ticket);
};
