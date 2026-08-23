const Ticket = require("../../models/ticket.model");

const getUserTicketUnreadCount = async (req, res) => {
  try {
    const count = await Ticket.countDocuments({
      submittedBy: req.user.id,
      unreadForUser: true,
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAdminTicketUnreadCount = async (req, res) => {
  try {
    const count = await Ticket.countDocuments({
      unreadForAdmin: true,
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getUserTicketUnreadCount,
  getAdminTicketUnreadCount,
};
