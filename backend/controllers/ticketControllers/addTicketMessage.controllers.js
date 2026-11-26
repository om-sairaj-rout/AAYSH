const Ticket = require("../../models/ticket.model");
const { uploadDocumentToS3 } = require("../../utils/s3");

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXT = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
]);

const validateMessageAttachment = (file) => {
  if (!file || !file.buffer?.length) return { ok: true };
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: "Attachment must be 10 MB or smaller" };
  }

  if (!ALLOWED_MIME.has(mime) && (!ext || !ALLOWED_EXT.has(ext))) {
    return {
      ok: false,
      message: "Attachment must be a PDF, image, or Word document",
    };
  }

  return { ok: true };
};

const populateTicket = (id) =>
  Ticket.findById(id)
    .populate("submittedBy", "companyName email fullName")
    .populate("assignedTo", "email fullName")
    .populate("resolvedBy", "email fullName")
    .populate("messages.sender", "fullName email companyName")
    .lean();

const addTicketMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const trimmedMessage = String(message || "").trim();

    if (!trimmedMessage && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Message or attachment is required",
      });
    }

    const attachmentCheck = validateMessageAttachment(req.file);
    if (!attachmentCheck.ok) {
      return res.status(400).json({
        success: false,
        message: attachmentCheck.message,
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(ticket.submittedBy) === String(req.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to reply on this ticket",
      });
    }

    if (!isAdmin) {
      if (ticket.status === "resolved") {
        return res.status(400).json({
          success: false,
          message: "Cannot reply to a resolved ticket",
        });
      }

      const hasAdminReply =
        (ticket.messages || []).some((entry) => entry.senderRole === "admin") ||
        Boolean(String(ticket.adminReply || "").trim());

      if (!hasAdminReply) {
        return res.status(400).json({
          success: false,
          message: "Please wait for admin to respond before replying",
        });
      }
    }

    const entry = {
      sender: req.user.id,
      senderRole: isAdmin ? "admin" : "user",
      message: trimmedMessage || "(attachment)",
      createdAt: new Date(),
    };

    if (req.file) {
      const uploaded = await uploadDocumentToS3({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        folder: `documents/tickets/${ticket.ticketId}/messages`,
        contentType: req.file.mimetype,
      });
      entry.attachmentName = uploaded.fileName;
      entry.s3Key = uploaded.s3Key;
      entry.s3Bucket = uploaded.s3Bucket;
      entry.contentType = req.file.mimetype || "";
    }

    ticket.messages.push(entry);

    if (isAdmin) {
      ticket.unreadForUser = true;
      ticket.unreadForAdmin = false;
      if (ticket.status === "pending") {
        ticket.status = "in_progress";
      }
      ticket.assignedTo = req.user.id;
      if (trimmedMessage) {
        ticket.adminReply = trimmedMessage;
      }
    } else {
      ticket.unreadForAdmin = true;
      ticket.unreadForUser = false;
    }

    await ticket.save();

    const populated = await populateTicket(ticket._id);

    return res.status(200).json({
      success: true,
      message: "Message sent",
      ticket: populated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = addTicketMessage;