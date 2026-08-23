const Ticket = require("../../models/ticket.model");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");

const getTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 20);

    const filter = { submittedBy: req.user.id };

    if (status && status !== "ALL") {
      filter.status = status;
    }

    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate("submittedBy", "companyName email fullName mobile_number")
        .populate("messages.sender", "fullName email companyName")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      tickets,
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, tickets.length),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tickets. Please try again.",
    });
  }
};

module.exports = getTickets;
