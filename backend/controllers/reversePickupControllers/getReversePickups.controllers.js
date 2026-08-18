const ReversePickup = require("../../models/reversePickup.model");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");

const getReversePickups = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const { status, company_id } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 20);

    const filter = {};

    if (isAdmin) {
      if (company_id && company_id !== "ALL") {
        filter.companyID = String(company_id).trim().toUpperCase();
      }
    } else {
      if (req.user.companyID) {
        filter.companyID = req.user.companyID;
      } else {
        filter.requestedBy = req.user.id;
      }
    }

    if (status && status !== "ALL") {
      filter.status = status;
    }

    const [total, requests] = await Promise.all([
      ReversePickup.countDocuments(filter),
      ReversePickup.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate("requestedBy", "companyName email fullName")
        .populate("reviewedBy", "email fullName")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      requests,
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, requests.length),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getReversePickups;
