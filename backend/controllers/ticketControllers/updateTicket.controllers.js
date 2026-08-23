const Ticket = require("../../models/ticket.model");

const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, adminReply } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    if (status !== undefined) {
      const validStatuses = Ticket.schema.path("status").enumValues;
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }
      ticket.status = status;
      if (status === "resolved") {
        ticket.resolvedBy = req.user.id;
        ticket.resolvedAt = new Date();
      }
    }

    if (priority !== undefined) {
      const validPriorities = Ticket.schema.path("priority").enumValues;
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority",
        });
      }
      ticket.priority = priority;
    }

    if (adminNotes !== undefined) {
      ticket.adminNotes = String(adminNotes).trim();
    }

    if (adminReply !== undefined) {
      const trimmedReply = String(adminReply).trim();
      ticket.adminReply = trimmedReply;
      if (trimmedReply) {
        ticket.messages.push({
          sender: req.user.id,
          senderRole: "admin",
          message: trimmedReply,
          createdAt: new Date(),
        });
        ticket.unreadForUser = true;
        ticket.unreadForAdmin = false;
        if (ticket.status === "pending") {
          ticket.status = "in_progress";
        }
      }
    }

    ticket.assignedTo = req.user.id;
    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate("submittedBy", "companyName email fullName")
      .populate("assignedTo", "email fullName")
      .populate("resolvedBy", "email fullName")
      .populate("messages.sender", "fullName email companyName")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
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

module.exports = updateTicket;
