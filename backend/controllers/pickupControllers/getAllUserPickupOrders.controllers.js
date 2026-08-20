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

const buildTabMatch = (tab) => {
  const todayStart = startOfDayIST(new Date());
  const todayEnd = endOfDayIST(new Date());

  switch (tab) {
    case "today":
      return {
        pickupDate: { $gte: todayStart, $lte: todayEnd },
        pickupStatus: { $nin: ["Failed", "Cancelled"] },
      };
    case "future":
      return {
        pickupDate: { $gt: todayEnd },
        pickupStatus: { $nin: ["Failed", "Cancelled"] },
      };
    case "failed":
      return { pickupStatus: "Failed" };
    case "cancelled":
      return { pickupStatus: "Cancelled" };
    case "completed":
      return { pickupStatus: "Completed" };
    case "all":
      return {};
    default:
      return {};
  }
};

const formatPickup = (item) => ({
  _id: String(item._id),
  orderId: item.order?._id ? String(item.order._id) : undefined,
  externalOrderId: item.order?.externalOrderId || "",
  awbNumber: item.awbNumber,
  courierName: item.courierName,
  pickupLocation: item.pickupLocation || "",
  pickupDate: toISTDate(item.pickupDate),
  pickupTime: item.pickupTime,
  packagesCount: item.order?.noOfBoxes || 1,
  pickupStatus: item.pickupStatus,
  failureReason: item.pickupStatus === "Failed" ? item.failureReason : "",
});

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

    pipeline.push(
      { $sort: { pickupDate: 1, createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          counts: [
            {
              $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orderForCount",
                pipeline: [{ $match: orderScope }],
              },
            },
            { $match: { orderForCount: { $ne: [] } } },
            {
              $group: {
                _id: "$pickupStatus",
                count: { $sum: 1 },
              },
            },
          ],
          data: [{ $skip: skip }, { $limit: perPage }],
        },
      }
    );

    const [result] = await Shipping.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;
    const data = (result.data || []).map(formatPickup);

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
                pickupStatus: { $nin: ["Failed", "Cancelled"] },
              },
            },
            { $count: "count" },
          ],
          future: [
            {
              $match: {
                pickupDate: { $gt: todayEnd },
                pickupStatus: { $nin: ["Failed", "Cancelled"] },
              },
            },
            { $count: "count" },
          ],
          failed: [{ $match: { pickupStatus: "Failed" } }, { $count: "count" }],
          cancelled: [
            { $match: { pickupStatus: "Cancelled" } },
            { $count: "count" },
          ],
          completed: [
            { $match: { pickupStatus: "Completed" } },
            { $count: "count" },
          ],
          all: [{ $count: "count" }],
        },
      },
    ]);

    const countFacet = countRows[0] || {};

    return res.status(200).json({
      success: true,
      data,
      counts: {
        today: countFacet.today?.[0]?.count || 0,
        future: countFacet.future?.[0]?.count || 0,
        failed: countFacet.failed?.[0]?.count || 0,
        cancelled: countFacet.cancelled?.[0]?.count || 0,
        completed: countFacet.completed?.[0]?.count || 0,
        all: countFacet.all?.[0]?.count || 0,
      },
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
