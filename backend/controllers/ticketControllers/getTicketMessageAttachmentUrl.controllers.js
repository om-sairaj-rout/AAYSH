const Ticket = require("../../models/ticket.model");
const { getPresignedDownloadUrl } = require("../../utils/s3");

const getTicketMessageAttachmentUrl = async (req, res) => {
  try {
    const { id, messageIndex } = req.params;
    const index = Number.parseInt(messageIndex, 10);

    const ticket = await Ticket.findById(id).lean();
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
        message: "Forbidden access",
      });
    }

    const message = ticket.messages?.[index];
    if (!message?.s3Key) {
      return res.status(404).json({
        success: false,
        message: "No attachment found for this message",
      });
    }

    const url = await getPresignedDownloadUrl(message.s3Key);

    return res.status(200).json({
      success: true,
      url,
      fileName: message.attachmentName || "attachment",
      contentType: message.contentType || "",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getTicketMessageAttachmentUrl;