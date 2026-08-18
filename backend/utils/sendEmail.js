const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (to, subject, html, options = {}) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  if (!to) {
    throw new Error("Recipient email is required");
  }

  const payload = {
    from: `Aaysh Express <${process.env.RESEND_FROM_EMAIL}>`,
    to,
    subject,
    html,
  };

  if (options.replyTo) {
    payload.reply_to = options.replyTo;
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    const message =
      error.message ||
      error.name ||
      (typeof error === "string" ? error : "Resend rejected the email");
    throw new Error(message);
  }

  return data;
};

module.exports = sendMail;
