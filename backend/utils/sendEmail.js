const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    family: 4,
    rejectUnauthorized: false,
  },
});

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