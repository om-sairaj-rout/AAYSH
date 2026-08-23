const Ticket = require("../../models/ticket.model");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");

const getAdminTickets = async (req, res) => {
  try {
    const { status, company_id, priority } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 50);

    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (company_id && company_id !== "ALL") {
      filter.companyID = String(company_id).trim().toUpperCase();
    }

    if (priority && priority !== "ALL") {
      filter.priority = priority;
    }

    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate("submittedBy", "companyName email fullName mobile_number")
        .populate("assignedTo", "email fullName companyName")
        .populate("resolvedBy", "email fullName")
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

module.exports = getAdminTickets;
