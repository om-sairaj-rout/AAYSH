const sendMail = require("./sendEmail");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildTicketEmailHtml = (ticket) => {
  const rows = [
    ["Ticket ID", ticket.ticketId],
    ["Company Name", ticket.companyName],
    ["Company ID", ticket.companyID],
    ["Full Name", ticket.fullName],
    ["Email", ticket.email],
    ["Phone", ticket.phone],
    ["Order / AWB", ticket.orderAwbNumber || "—"],
    ["Issue Type", ticket.category],
    ["Subject", ticket.subject],
    ["Priority", ticket.priority],
    ["Status", ticket.status],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;width:160px;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:640px;">
      <h2 style="color:#1B2B4B;margin-bottom:8px;">New Support / Complaint Ticket</h2>
      <p style="color:#64748b;margin-top:0;">A new ticket was submitted through the Aaysh Express portal.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
        ${tableRows}
      </table>
      <h3 style="color:#1B2B4B;font-size:14px;margin-bottom:8px;">Description</h3>
      <p style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:14px;">${escapeHtml(ticket.description)}</p>
      ${
        ticket.attachmentName
          ? `<p style="font-size:13px;color:#64748b;margin-top:16px;"><strong>Attachment:</strong> ${escapeHtml(ticket.attachmentName)}</p>`
          : ""
      }
    </div>
  `;
};

const notifySupportTicket = async (ticket) => {
  const to = process.env.CONTACT_EMAIL;

  if (!to) {
    console.warn("Support ticket email skipped: CONTACT_EMAIL is not configured");
    return { sent: false, reason: "missing_contact_email" };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("Support ticket email skipped: RESEND_API_KEY is not configured");
    return { sent: false, reason: "missing_resend_key" };
  }

  const subject = `New Support Ticket ${ticket.ticketId}: ${ticket.subject}`;
  const html = buildTicketEmailHtml(ticket);

  await sendMail(to, subject, html, {
    replyTo: ticket.email || undefined,
  });

  console.log(`Support ticket email sent for ${ticket.ticketId}`);
  return { sent: true, to };
};

module.exports = {
  notifySupportTicket,
};
