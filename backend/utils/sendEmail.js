const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

(async () => {
  try {
    await transporter.verify();
    console.log("SMTP Connected");
  } catch (err) {
    console.error("SMTP Verify Error:", err);
  }
})();

const sendMail = async (to, subject, html) => {
  console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};

module.exports = sendMail;