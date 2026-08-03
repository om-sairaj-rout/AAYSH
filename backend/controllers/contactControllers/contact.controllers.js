const sendMail = require("../../utils/sendEmail");

const contactForm = async (req, res) => {
  try {
    const {
      name,
      email,
      businessName,
      message
    } = req.body;

    if (
      !name ||
      !email ||
      !businessName ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields required"
      });
    }

    const html = `
      <h2>New Contact Form Submission</h2>

      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Business:</b> ${businessName}</p>
      <p><b>Message:</b></p>
      <p>${message}</p>
    `;

    await sendMail(
  process.env.CONTACT_EMAIL,
  "New Contact Form - Aaysh Express",
  html
);

    return res.status(200).json({
      success: true,
      message: "Message sent"
    });

  } catch (err) {
  console.error("MAIL ERROR:", err);

  return res.status(500).json({
    success: false,
    message: err.message,
    error: err
  });
}
};

module.exports = contactForm;