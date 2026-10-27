const mongoose = require("mongoose");
const Shipping = require("../models/upload/shipping.model");
const { startOfDayIST, endOfDayIST, toISTDate } = require("./dateTime");
const {
  countSchedulesForPickupTab,
  fetchSchedulePickupRowsPaginated,
  countSchedulesByPickupTabs,
  addScheduleCounts,
} = require("./pickupScheduleListMerge");

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
  return { "order.companyID": companyFilterId };
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
    courierName: pickup.courierName || pickup.courier?.name || "",
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

const buildShipmentBasePipeline = (tab, companyFilterId, searchTerm) => {
  const baseMatch = {
    awbNumber: { $ne: "" },
    pickupStatus: { $in: ["Scheduled", "Failed", "Completed", "Cancelled"] },
    ...buildTabMatch(tab),
  };

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

  pipeline.push({ $sort: { pickupDate: 1, _id: 1 } });
  return pipeline;
};

const countShipmentRows = async (tab, companyFilterId, searchTerm) => {
  const pipeline = [...buildShipmentBasePipeline(tab, companyFilterId, searchTerm), { $count: "count" }];
  const rows = await Shipping.aggregate(pipeline);
  return rows[0]?.count || 0;
};

const fetchShipmentBatch = async (tab, companyFilterId, searchTerm, skip, limit) => {
  const pipeline = [
    ...buildShipmentBasePipeline(tab, companyFilterId, searchTerm),
    { $skip: skip },
    { $limit: limit },
  ];
  const rows = await Shipping.aggregate(pipeline);
  return rows.map(formatPickup);
};

const comparePickupRows = (a, b) => {
  const dateA = new Date(a.pickupDate || 0).getTime();
  const dateB = new Date(b.pickupDate || 0).getTime();
  if (dateA !== dateB) return dateA - dateB;
  return String(a._id).localeCompare(String(b._id));
};

const paginateMergedPickupPage = async ({
  tab,
  companyFilterId,
  searchTerm,
  skip,
  perPage,
  scheduleScope,
}) => {
  const shipmentTotal = await countShipmentRows(tab, companyFilterId, searchTerm);
  const scheduleTotal = await countSchedulesForPickupTab({
    tab,
    search: searchTerm,
    baseScope: scheduleScope,
  });
  const total = shipmentTotal + scheduleTotal;
  const targetEnd = skip + perPage;
  const SHIP_BATCH = 120;
  const SCH_BATCH = Math.min(50, Math.max(perPage + 10, 25));

  let shipOffset = 0;
  let schOffset = 0;
  let shipQueue = [];
  let schQueue = [];
  const merged = [];

  while (merged.length < targetEnd) {
    if (!shipQueue.length && shipOffset < shipmentTotal) {
      shipQueue = await fetchShipmentBatch(
        tab,
        companyFilterId,
        searchTerm,
        shipOffset,
        SHIP_BATCH
      );
      shipOffset += shipQueue.length;
    }
    if (!schQueue.length && schOffset < scheduleTotal) {
      schQueue = await fetchSchedulePickupRowsPaginated({
        tab,
        search: searchTerm,
        baseScope: scheduleScope,
        skip: schOffset,
        limit: SCH_BATCH,
      });
      schOffset += schQueue.length;
    }

    if (!shipQueue.length && !schQueue.length) {
      break;
    }

    const nextShip = shipQueue[0];
    const nextSch = schQueue[0];

    if (nextShip && (!nextSch || comparePickupRows(nextShip, nextSch) <= 0)) {
      merged.push(shipQueue.shift());
    } else if (nextSch) {
      merged.push(schQueue.shift());
    } else {
      merged.push(shipQueue.shift());
    }
  }

  return {
    data: merged.slice(skip, skip + perPage),
    total,
  };
};

const countShipmentTabs = async (companyFilterId) => {
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

  const companyMatch = buildCompanyMatch(companyFilterId);
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
      completed: [{ $match: { pickupStatus: "Completed" } }, { $count: "count" }],
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
  return {
    today: countResult?.today?.[0]?.count || 0,
    future: countResult?.future?.[0]?.count || 0,
    failed: countResult?.failed?.[0]?.count || 0,
    completed: countResult?.completed?.[0]?.count || 0,
    scheduled: countResult?.scheduled?.[0]?.count || 0,
    all: countResult?.all?.[0]?.count || 0,
  };
};

module.exports = {
  paginateMergedPickupPage,
  countShipmentTabs,
  addScheduleCounts,
  countSchedulesByPickupTabs,
};
