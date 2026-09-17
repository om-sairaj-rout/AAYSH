const mongoose = require("mongoose");
const Shipping = require("../../models/upload/shipping.model");
const PickupSchedule = require("../../models/pickupSchedule.model");
const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { toISTDate, startOfDayIST, endOfDayIST } = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const {
  listSchedulesForPickupTab,
  countSchedulesByPickupTabs,
  mergeAndPaginatePickups,
  addScheduleCounts,
} = require("../../utils/pickupScheduleListMerge");

const buildTabMatch = (tab) => {
  const todayStart = startOfDayIST(new Date());
  const todayEnd = endOfDayIST(new Date());
  const activePickup = {
    shippingStatus: { $ne: "Cancelled" },
    pickupStatus: { $nin: ["Failed", "Cancelled"] },
  };

  switch (tab) {
    case "today":
      return {
        pickupDate: { $gte: todayStart, $lte: todayEnd },
        ...activePickup,
      };
    case "future":
      return {
        pickupDate: { $gt: todayEnd },
        ...activePickup,
      };
    case "failed":
      return { pickupStatus: "Failed", shippingStatus: { $ne: "Cancelled" } };
    case "completed":
      return { pickupStatus: "Completed" };
    case "scheduled":
      return { pickupStatus: "Scheduled", shippingStatus: { $ne: "Cancelled" } };
    case "all":
      return {};
    default:
      return {
        pickupDate: { $gte: todayStart, $lte: todayEnd },
        ...activePickup,
      };
  }
};

const buildOrderLookupPipeline = () => [
  {
    $lookup: {
      from: "users",
      localField: "uploadedBy",
      foreignField: "_id",
      as: "uploadedBy",
    },
  },
  {
    $unwind: {
      path: "$uploadedBy",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      externalOrderId: 1,
      companyID: 1,
      noOfBoxes: 1,
      uploadedBy: {
        _id: 1,
        companyName: 1,
        email: 1,
      },
    },
  },
];

const buildCompanyMatch = (companyFilterId) => {
  if (!companyFilterId) return null;

  return {
    "order.companyID": companyFilterId,
  };
};

const resolveCompanyFilterId = async ({ company_id, user_id }) => {
  const directCompanyId =
    company_id && company_id !== "ALL"
      ? String(company_id).trim().toUpperCase()
      : null;

  if (directCompanyId) {
    return directCompanyId;
  }

  const userFilterId =
    user_id && user_id !== "ALL" ? String(user_id).trim() : null;

  if (!userFilterId) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(userFilterId)) {
    const userDoc = await User.findById(userFilterId).select("companyID").lean();
    if (userDoc?.companyID) {
      return String(userDoc.companyID).trim().toUpperCase();
    }
  }

  return String(userFilterId).trim().toUpperCase();
};

const isTestCompanyId = (companyID) =>
  /^TEST-ORDER-ID/i.test(String(companyID || "").trim());

const buildAdminCompanyOptions = async () => {
  const [companies, owners] = await Promise.all([
    Company.find({ isActive: { $ne: false } })
      .select("companyID companyName")
      .sort({ companyName: 1 })
      .lean(),
    User.find({ companyRole: "owner" })
      .select("companyID email")
      .lean(),
  ]);

  const ownerByCompany = new Map(
    owners.map((owner) => [owner.companyID, owner])
  );

  return companies
    .filter((company) => !isTestCompanyId(company.companyID))
    .map((company) => ({
      companyID: company.companyID,
      companyName: company.companyName || company.companyID,
      email: ownerByCompany.get(company.companyID)?.email || "",
    }));
};

const buildSearchMatch = (searchTerm) => {
  if (!searchTerm) return null;

  const searchRegex = { $regex: searchTerm, $options: "i" };
  const searchOr = [
    { awbNumber: searchRegex },
    { courierName: searchRegex },
    { "order.externalOrderId": searchRegex },
    { "order.uploadedBy.companyName": searchRegex },
    { "courier.name": searchRegex },
  ];

  if (mongoose.Types.ObjectId.isValid(searchTerm)) {
    searchOr.push({ orderId: new mongoose.Types.ObjectId(searchTerm) });
  }

  return { $match: { $or: searchOr } };
};

const formatPickup = (pickup) => {
  const boxes = pickup.order?.noOfBoxes || 1;
  return {
    _id: String(pickup._id),
    orderId: pickup.order?._id,
    externalOrderId: pickup.order?.externalOrderId,
    awbNumber: pickup.awbNumber,
    courierName:
      pickup.courierName || pickup.courier?.name || "",
    contactPhone: pickup.courier?.contactPhone || "",
    pickupDate: toISTDate(pickup.pickupDate),
    pickupTime: pickup.pickupTime,
    pickupLocation: pickup.pickupLocation,
    pickupStatus: pickup.pickupStatus,
    failureReason: pickup.failureReason,
    packagesCount: boxes,
    noOfBoxes: boxes,
    orderBoxCounts: [boxes],
    userId: pickup.order?.uploadedBy
      ? {
          _id: String(pickup.order.uploadedBy._id),
          companyName: pickup.order.uploadedBy.companyName,
          email: pickup.order.uploadedBy.email,
        }
      : null,
  };
};

const getAdminPickups = async (req, res) => {
  try {
    const { tab = "today", search, user_id, company_id } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 20);

    const baseMatch = {
      awbNumber: { $ne: "" },
      pickupStatus: { $in: ["Scheduled", "Failed", "Completed", "Cancelled"] },
      ...buildTabMatch(tab),
    };

    const searchTerm = search ? String(search).trim() : "";

    const companyFilterId = await resolveCompanyFilterId({
      company_id,
      user_id,
    });

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
          pipeline: buildOrderLookupPipeline(),
        },
      },
      { $match: { order: { $ne: [] } } },
      { $unwind: "$order" },
    ];

    const companyMatch = buildCompanyMatch(companyFilterId);
    if (companyMatch) {
      pipeline.push({ $match: companyMatch });
    }

    pipeline.push(
      {
        $lookup: {
          from: "couriers",
          localField: "courierId",
          foreignField: "_id",
          as: "courier",
        },
      },
      {
        $unwind: {
          path: "$courier",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    const searchMatch = buildSearchMatch(searchTerm);
    if (searchMatch) {
      pipeline.push(searchMatch);
    }

    pipeline.push({ $sort: { pickupDate: 1 } });

    const shipmentRows = (await Shipping.aggregate(pipeline)).map(formatPickup);
    const scheduleScope = companyFilterId
      ? { companyID: companyFilterId }
      : {};
    const scheduleRows = await listSchedulesForPickupTab({
      tab,
      search: searchTerm,
      baseScope: scheduleScope,
    });
    const { data: formatted, total } = mergeAndPaginatePickups(
      shipmentRows,
      scheduleRows,
      { skip, perPage }
    );

    const todayStart = startOfDayIST(new Date());
    const todayEnd = endOfDayIST(new Date());

    const countPipeline = [
      {
        $match: {
          awbNumber: { $ne: "" },
          pickupStatus: { $in: ["Scheduled", "Failed", "Completed", "Cancelled"] },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
          pipeline: buildOrderLookupPipeline(),
        },
      },
      { $match: { order: { $ne: [] } } },
      { $unwind: "$order" },
    ];

    if (companyMatch) {
      countPipeline.push({ $match: companyMatch });
    }

    countPipeline.push({
      $facet: {
        today: [
          {
            $match: {
              pickupDate: { $gte: todayStart, $lte: todayEnd },
              shippingStatus: { $ne: "Cancelled" },
              pickupStatus: { $nin: ["Failed", "Cancelled"] },
            },
          },
          { $count: "count" },
        ],
        future: [
          {
            $match: {
              pickupDate: { $gt: todayEnd },
              shippingStatus: { $ne: "Cancelled" },
              pickupStatus: { $nin: ["Failed", "Cancelled"] },
            },
          },
          { $count: "count" },
        ],
        failed: [
          {
            $match: {
              pickupStatus: "Failed",
              shippingStatus: { $ne: "Cancelled" },
            },
          },
          { $count: "count" },
        ],
        completed: [
          { $match: { pickupStatus: "Completed" } },
          { $count: "count" },
        ],
        scheduled: [
          {
            $match: {
              pickupStatus: "Scheduled",
              shippingStatus: { $ne: "Cancelled" },
            },
          },
          { $count: "count" },
        ],
        all: [{ $count: "count" }],
      },
    });

    const [countResult] = await Shipping.aggregate(countPipeline);
    const scheduleCounts = await countSchedulesByPickupTabs(scheduleScope);
    const shipmentCounts = {
      today: countResult?.today?.[0]?.count || 0,
      future: countResult?.future?.[0]?.count || 0,
      failed: countResult?.failed?.[0]?.count || 0,
      completed: countResult?.completed?.[0]?.count || 0,
      scheduled: countResult?.scheduled?.[0]?.count || 0,
      all: countResult?.all?.[0]?.count || 0,
    };

    const companies = await buildAdminCompanyOptions();

    return res.json({
      success: true,
      data: formatted,
      users: companies.map((company) => ({
        id: company.companyID,
        companyID: company.companyID,
        name: company.companyName || company.companyID || "Unknown",
        email: company.email || "",
      })),
      counts: addScheduleCounts(shipmentCounts, scheduleCounts),
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, formatted.length),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getAdminPickups;
