const Ticket = require("../../models/ticket.model");
const { getPresignedDownloadUrl } = require("../../utils/s3");

const getTicketAttachmentUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      String(ticket.submittedBy) === String(req.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    if (ticket.s3Key) {
      const url = await getPresignedDownloadUrl(ticket.s3Key);
      return res.status(200).json({
        success: true,
        url,
        fileName: ticket.attachmentName || "attachment",
      });
    }

    if (ticket.attachmentPath) {
      return res.status(200).json({
        success: true,
        url: ticket.attachmentPath,
        fileName: ticket.attachmentName || "attachment",
        legacy: true,
      });
    }

    return res.status(404).json({
      success: false,
      message: "No attachment found for this ticket",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getTicketAttachmentUrl;
