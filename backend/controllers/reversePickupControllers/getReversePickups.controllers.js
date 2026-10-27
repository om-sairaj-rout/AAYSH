const ReversePickup = require("../../models/reversePickup.model");
const Shipping = require("../../models/upload/shipping.model");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { enrichReversePickupRequests } = require("../../utils/reversePickupSync");
const { buildReversePickupSearchFilter } = require("../../utils/reversePickupSearch");

const LIST_SELECT =
  "requestId companyID status fromName fromPhone toName toPincode awbNumber originalAwbNumber courierName modeType pickupDate pickupTime pieces weight failureReason adminStatusLocked syncedShippingStatus syncedPickupStatus createdAt orderId externalOrderId";

const getReversePickups = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const {
      status,
      company_id,
      search,
      q,
      from,
      to,
      shipping_status,
    } = req.query;
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

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          filter.createdAt.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }
      if (!Object.keys(filter.createdAt).length) {
        delete filter.createdAt;
      }
    }

    if (shipping_status && shipping_status !== "ALL") {
      filter.syncedShippingStatus = String(shipping_status).trim();
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
        .select(LIST_SELECT)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate("requestedBy", "companyName email")
        .populate({
          path: "orderId",
          select: "externalOrderId consigneeName",
        })
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
