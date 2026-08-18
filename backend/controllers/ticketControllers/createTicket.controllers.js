const Ticket = require("../../models/ticket.model");
const User = require("../../models/user.model");
const { uploadDocumentToS3 } = require("../../utils/s3");
const { notifySupportTicket } = require("../../utils/notifySupportTicket");

const createTicket = async (req, res) => {
  try {
    const { subject, category, description, orderAwbNumber } = req.body;

    if (!String(subject || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!String(category || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Issue type is required",
      });
    }

    if (!String(description || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const validCategories = Ticket.schema.path("category").enumValues;
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue type",
      });
    }

    const submitter = await User.findById(req.user.id)
      .select(
        "companyID companyName fullName email mobile_number address city state country gstin"
      )
      .lean();

    if (!submitter) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });
    }

    let attachmentMeta = {
      attachmentName: "",
      attachmentPath: "",
      s3Key: "",
      s3Bucket: "",
    };

    if (req.file) {
      try {
        const uploaded = await uploadDocumentToS3({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          folder: "documents/tickets",
          contentType: req.file.mimetype,
        });
        attachmentMeta = {
          attachmentName: uploaded.fileName,
          attachmentPath: "",
          s3Key: uploaded.s3Key,
          s3Bucket: uploaded.s3Bucket,
        };
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload attachment. Please try again.",
        });
      }
    }

    const ticket = await Ticket.create({
      ticketId: `TKT-${Date.now()}`,
      subject: String(subject).trim(),
      category,
      description: String(description).trim(),
      orderAwbNumber: String(orderAwbNumber || "").trim(),
      status: "pending",
      priority: "medium",
      submittedBy: req.user.id,
      companyID: submitter.companyID || req.user.companyID || "",
      companyName: submitter.companyName || req.user.companyName || "",
      fullName: submitter.fullName || "",
      email: submitter.email || "",
      phone: submitter.mobile_number || "",
      ...attachmentMeta,
    });

    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await notifySupportTicket(ticket.toObject());
      emailSent = Boolean(emailResult?.sent);
      if (!emailSent) {
        emailError = emailResult?.reason || "email_not_sent";
      }
    } catch (err) {
      emailError = err.message;
      console.error("SUPPORT TICKET EMAIL ERROR:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Support ticket submitted successfully. Our support team has been notified."
        : "Support ticket submitted successfully. We will get back to you shortly.",
      emailSent,
      emailError: emailSent ? null : emailError,
      ticket,
    });
  } catch (error) {
    console.error("CREATE TICKET ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit support ticket. Please try again.",
    });
  }
};

module.exports = createTicket;
