const ReversePickup = require("../../models/reversePickup.model");
const Shipping = require("../../models/upload/shipping.model");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { enrichReversePickupRequests } = require("../../utils/reversePickupSync");
const { buildReversePickupSearchFilter } = require("../../utils/reversePickupSearch");

const getReversePickups = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const { status, company_id, search, q } = req.query;
    const searchQuery = String(search || q || "").trim();
    const { page, perPage, skip } = parsePagination(req.query, 20);

    const filter = {};

    if (isAdmin) {
      if (company_id && company_id !== "ALL") {
        filter.companyID = String(company_id).trim().toUpperCase();
      }
    } else if (req.user.companyID) {
      filter.companyID = req.user.companyID;
    } else {
      filter.requestedBy = req.user.id;
    }

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (searchQuery) {
      const searchFilter = await buildReversePickupSearchFilter(
        searchQuery,
        Shipping
      );
      if (searchFilter) {
        if (Object.keys(filter).length > 0) {
          const baseFilter = { ...filter };
          Object.keys(filter).forEach((key) => delete filter[key]);
          filter.$and = [baseFilter, searchFilter];
        } else {
          Object.assign(filter, searchFilter);
        }
      }
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

    const enrichedRequests = await enrichReversePickupRequests(requests);

    return res.status(200).json({
      success: true,
      requests: enrichedRequests,
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
