const mongoose = require("mongoose");
const Shipping = require("../../models/upload/shipping.model");
const {
  toISTDate,
  startOfDayIST,
  endOfDayIST,
} = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { buildOrderScopeForUser } = require("../../utils/companyScope");
const {
  buildScheduleScopeForUser,
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
    case "cancelled":
      return {
        $or: [
          { pickupStatus: "Cancelled" },
          { shippingStatus: "Cancelled" },
        ],
      };
    case "completed":
      return { pickupStatus: "Completed" };
    case "scheduled":
      return {
        pickupStatus: "Scheduled",
        shippingStatus: { $ne: "Cancelled" },
      };
    case "all":
      return {};
    default:
      return {};
  }
};

const formatPickup = (item) => {
  const boxes = item.order?.noOfBoxes || 1;
  return {
    _id: String(item._id),
    orderId: item.order?._id ? String(item.order._id) : undefined,
    externalOrderId: item.order?.externalOrderId || "",
    awbNumber: item.awbNumber,
    courierName: item.courierName,
    pickupLocation: item.pickupLocation || "",
    pickupDate: toISTDate(item.pickupDate),
    pickupTime: item.pickupTime,
    packagesCount: boxes,
    noOfBoxes: boxes,
    orderBoxCounts: [boxes],
    pickupStatus: item.pickupStatus,
    failureReason: item.pickupStatus === "Failed" ? item.failureReason : "",
  };
};

const getUserPickups = async (req, res) => {
  try {
    const { tab = "today", search } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 20);
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const orderScope = buildOrderScopeForUser(req.user);

    const baseMatch = {
      awbNumber: { $ne: "" },
      ...buildTabMatch(tab),
    };

    const searchTerm = search ? String(search).trim() : "";

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
          pipeline: [
            {
              $match: orderScope,
            },
            {
              $project: {
                externalOrderId: 1,
                orderItems: 1,
                noOfBoxes: 1,
              },
            },
          ],
        },
      },
      { $match: { order: { $ne: [] } } },
      { $unwind: "$order" },
    ];

    if (searchTerm) {
      const searchRegex = { $regex: searchTerm, $options: "i" };
      const searchOr = [
        { awbNumber: searchRegex },
        { courierName: searchRegex },
        { "order.externalOrderId": searchRegex },
      ];

      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        searchOr.push({ orderId: new mongoose.Types.ObjectId(searchTerm) });
      }

      pipeline.push({ $match: { $or: searchOr } });
    }

    pipeline.push({ $sort: { pickupDate: 1, createdAt: -1 } });

    const shipmentRows = (await Shipping.aggregate(pipeline)).map(formatPickup);
    const scheduleScope = buildScheduleScopeForUser(req.user);
    const scheduleRows = await listSchedulesForPickupTab({
      tab,
      search: searchTerm,
      baseScope: scheduleScope,
    });
    const { data, total } = mergeAndPaginatePickups(shipmentRows, scheduleRows, {
      skip,
      perPage,
    });

    const todayStart = startOfDayIST(new Date());
    const todayEnd = endOfDayIST(new Date());

    const countRows = await Shipping.aggregate([
      { $match: { awbNumber: { $ne: "" } } },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
          pipeline: [{ $match: orderScope }],
        },
      },
      { $match: { order: { $ne: [] } } },
      {
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
          cancelled: [
            {
              $match: {
                $or: [
                  { pickupStatus: "Cancelled" },
                  { shippingStatus: "Cancelled" },
                ],
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
      },
    ]);

    const countFacet = countRows[0] || {};
    const scheduleCounts = await countSchedulesByPickupTabs(scheduleScope);
    const shipmentCounts = {
      today: countFacet.today?.[0]?.count || 0,
      future: countFacet.future?.[0]?.count || 0,
      failed: countFacet.failed?.[0]?.count || 0,
      cancelled: countFacet.cancelled?.[0]?.count || 0,
      completed: countFacet.completed?.[0]?.count || 0,
      scheduled: countFacet.scheduled?.[0]?.count || 0,
      all: countFacet.all?.[0]?.count || 0,
    };

    return res.status(200).json({
      success: true,
      data,
      counts: addScheduleCounts(shipmentCounts, scheduleCounts),
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, data.length),
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pickups",
    });
  }
};

module.exports = getUserPickups;
