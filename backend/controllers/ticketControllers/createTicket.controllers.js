const Ticket = require("../../models/ticket.model");
const User = require("../../models/user.model");
const { uploadDocumentToS3 } = require("../../utils/s3");
const { notifySupportTicket } = require("../../utils/notifySupportTicket");
const { validateRequiredPhone } = require("../../utils/phone");
const {
  parseIssueTypesInput,
  validateIssueTypes,
  deriveLegacyCategory,
} = require("../../utils/ticketIssueTypes");

const requirePartyField = (value, label) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return `${label} is required`;
  }
  return null;
};

const validateOptionalPincode = (value, label) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return { ok: true, value: "" };
  if (!/^\d{6}$/.test(digits)) {
    return { ok: false, message: `${label} must be a valid 6-digit pincode` };
  }
  return { ok: true, value: digits };
};

const createTicket = async (req, res) => {
  try {
    const {
      subject,
      category,
      issueTypes,
      description,
      orderAwbNumber,
      fromName,
      fromPhone,
      fromAddress,
      fromCity,
      fromState,
      fromPincode,
      toName,
      toPhone,
      toAddress,
      toCity,
      toState,
      toPincode,
    } = req.body;

    if (!String(subject || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!String(description || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const parsedIssueTypes = parseIssueTypesInput(issueTypes || category);
    const issueCheck = validateIssueTypes(parsedIssueTypes);
    if (!issueCheck.ok) {
      return res.status(400).json({
        success: false,
        message: issueCheck.message,
      });
    }

    const partyErrors = [
      requirePartyField(fromName, "From name"),
      requirePartyField(fromAddress, "From address"),
      requirePartyField(fromCity, "From city"),
      requirePartyField(fromState, "From state"),
    ].filter(Boolean);

    if (partyErrors.length) {
      return res.status(400).json({
        success: false,
        message: partyErrors[0],
      });
    }

    const fromPhoneError = validateRequiredPhone(fromPhone, "From phone number");
    if (!fromPhoneError.ok) {
      return res.status(400).json({
        success: false,
        message: fromPhoneError.message,
      });
    }

    const fromPincodeError = validateOptionalPincode(fromPincode, "From pincode");
    if (!fromPincodeError.ok) {
      return res.status(400).json({
        success: false,
        message: fromPincodeError.message,
      });
    }

  const toPincodeError = validateOptionalPincode(toPincode, "To pincode");
    if (!toPincodeError.ok) {
      return res.status(400).json({
        success: false,
        message: toPincodeError.message,
      });
    }

    const legacyCategory = deriveLegacyCategory(issueCheck.value);
    const validCategories = Ticket.schema.path("category").enumValues;
    const resolvedCategory = validCategories.includes(legacyCategory)
      ? legacyCategory
      : "Other";

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
      category: resolvedCategory,
      issueTypes: issueCheck.value,
      description: String(description).trim(),
      orderAwbNumber: String(orderAwbNumber || "").trim(),
      fromName: String(fromName).trim(),
      fromPhone: fromPhoneError.value,
      fromAddress: String(fromAddress).trim(),
      fromCity: String(fromCity).trim(),
      fromState: String(fromState).trim(),
      fromPincode: fromPincodeError.value,
      toName: String(toName || "").trim(),
      toPhone: String(toPhone || "").trim(),
      toAddress: String(toAddress || "").trim(),
      toCity: String(toCity || "").trim(),
      toState: String(toState || "").trim(),
      toPincode: toPincodeError.value,
      unreadForAdmin: true,
      unreadForUser: false,
      status: "pending",
      priority: "medium",
      submittedBy: req.user.id,
      companyID: submitter.companyID || req.user.companyID || "",
      companyName: submitter.companyName || req.user.companyName || "",
      fullName: submitter.fullName || "",
      email: submitter.email || "",
      phone: submitter.mobile_number || "",
      messages: [
        {
          sender: req.user.id,
          senderRole: "user",
          message: String(description).trim(),
          createdAt: new Date(),
        },
      ],
      ...attachmentMeta,
    });

    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await notifySupportTicket({
        ...ticket.toObject(),
        category: issueCheck.value.join("; "),
      });
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