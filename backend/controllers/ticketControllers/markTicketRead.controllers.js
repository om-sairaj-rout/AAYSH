const Ticket = require("../../models/ticket.model");

const markTicketRead = async (req, res) => {
  try {
    const { id } = req.params;
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
        message: "You do not have permission to access this ticket",
      });
    }

    if (isAdmin) {
      ticket.unreadForAdmin = false;
    } else {
      ticket.unreadForUser = false;
    }

    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate("submittedBy", "companyName email fullName mobile_number")
      .populate("assignedTo", "email fullName")
      .populate("resolvedBy", "email fullName")
      .populate("messages.sender", "fullName email companyName")
      .lean();

    return res.status(200).json({
      success: true,
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

module.exports = markTicketRead;
