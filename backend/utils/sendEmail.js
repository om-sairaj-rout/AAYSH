const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (to, subject, html) => {
  await resend.emails.send({
    from: "Aaysh Express <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
};

module.exports = sendMail;