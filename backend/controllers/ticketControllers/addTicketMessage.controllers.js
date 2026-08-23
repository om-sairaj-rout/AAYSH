const Ticket = require("../../models/ticket.model");

const addTicketMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const trimmedMessage = String(message || "").trim();

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
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

    ticket.messages.push({
      sender: req.user.id,
      senderRole: isAdmin ? "admin" : "user",
      message: trimmedMessage,
      createdAt: new Date(),
    });

    if (isAdmin) {
      ticket.unreadForUser = true;
      ticket.unreadForAdmin = false;
      if (ticket.status === "pending") {
        ticket.status = "in_progress";
      }
      ticket.assignedTo = req.user.id;
      ticket.adminReply = trimmedMessage;
    } else {
      ticket.unreadForAdmin = true;
      ticket.unreadForUser = false;
    }

    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate("submittedBy", "companyName email fullName")
      .populate("assignedTo", "email fullName")
      .populate("resolvedBy", "email fullName")
      .populate("messages.sender", "fullName email companyName")
      .lean();

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
