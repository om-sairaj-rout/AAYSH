const mongoose = require("mongoose");
const Shipping = require("../../models/upload/shipping.model");
const { toISTDate, startOfDayIST, endOfDayIST } = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");

const buildTabMatch = (tab) => {
  const todayStart = startOfDayIST(new Date());
  const todayEnd = endOfDayIST(new Date());

  switch (tab) {
    case "today":
      return {
        pickupDate: { $gte: todayStart, $lte: todayEnd },
        pickupStatus: { $ne: "Failed" },
      };
    case "future":
      return {
        pickupDate: { $gt: todayEnd },
        pickupStatus: { $ne: "Failed" },
      };
    case "failed":
      return { pickupStatus: "Failed" };
    case "completed":
      return { pickupStatus: "Completed" };
    case "scheduled":
      return { pickupStatus: "Scheduled" };
    case "all":
      return {};
    default:
      return {
        pickupDate: { $gte: todayStart, $lte: todayEnd },
        pickupStatus: { $ne: "Failed" },
      };
  }
};

const formatPickup = (pickup) => ({
  _id: pickup._id,
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
  packagesCount: 1,
  userId: pickup.order?.uploadedBy
    ? {
        _id: pickup.order.uploadedBy._id,
        companyName: pickup.order.uploadedBy.companyName,
        email: pickup.order.uploadedBy.email,
      }
    : null,
});

const getAdminPickups = async (req, res) => {
  try {
    const { tab = "today", search, user_id } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 20);

    const baseMatch = {
      awbNumber: { $ne: "" },
      pickupStatus: { $in: ["Scheduled", "Failed", "Completed"] },
      ...buildTabMatch(tab),
    };

    if (search) {
      baseMatch.$or = [
        { awbNumber: { $regex: search, $options: "i" } },
        { pickupLocation: { $regex: search, $options: "i" } },
      ];
    }

    const orderMatch = {};

    if (user_id && user_id !== "ALL") {
      orderMatch["order.uploadedBy"] = new mongoose.Types.ObjectId(user_id);
    }

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
                uploadedBy: {
                  _id: 1,
                  companyName: 1,
                  email: 1,
                },
              },
            },
          ],
        },
      },
      { $unwind: "$order" },
    ];

    if (Object.keys(orderMatch).length > 0) {
      pipeline.push({ $match: orderMatch });
    }

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { awbNumber: { $regex: search, $options: "i" } },
            { pickupLocation: { $regex: search, $options: "i" } },
            { "order.externalOrderId": { $regex: search, $options: "i" } },
            { "order.uploadedBy.companyName": { $regex: search, $options: "i" } },
          ],
        },
      });
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
      },
      { $sort: { pickupDate: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: perPage }],
        },
      }
    );

    const [result] = await Shipping.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;
    const formatted = (result.data || []).map(formatPickup);

    const todayStart = startOfDayIST(new Date());
    const todayEnd = endOfDayIST(new Date());

    const countPipeline = [
      {
        $match: {
          awbNumber: { $ne: "" },
          pickupStatus: { $in: ["Scheduled", "Failed", "Completed"] },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
    ];

    if (user_id && user_id !== "ALL") {
      countPipeline.push({
        $match: {
          "order.uploadedBy": new mongoose.Types.ObjectId(user_id),
        },
      });
    }

    countPipeline.push({
      $facet: {
        today: [
          {
            $match: {
              pickupDate: { $gte: todayStart, $lte: todayEnd },
              pickupStatus: { $ne: "Failed" },
            },
          },
          { $count: "count" },
        ],
        future: [
          {
            $match: {
              pickupDate: { $gt: todayEnd },
              pickupStatus: { $ne: "Failed" },
            },
          },
          { $count: "count" },
        ],
        failed: [{ $match: { pickupStatus: "Failed" } }, { $count: "count" }],
        completed: [
          { $match: { pickupStatus: "Completed" } },
          { $count: "count" },
        ],
        scheduled: [
          { $match: { pickupStatus: "Scheduled" } },
          { $count: "count" },
        ],
        all: [{ $count: "count" }],
      },
    });

    const [countResult] = await Shipping.aggregate(countPipeline);

    const users = await Shipping.aggregate([
      {
        $match: {
          awbNumber: { $ne: "" },
          pickupStatus: { $in: ["Scheduled", "Failed", "Completed"] },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "uploadedBy",
                foreignField: "_id",
                as: "uploadedBy",
              },
            },
            { $unwind: "$uploadedBy" },
            {
              $project: {
                uploadedBy: {
                  _id: 1,
                  companyName: 1,
                  email: 1,
                },
              },
            },
          ],
        },
      },
      { $unwind: "$order" },
      {
        $group: {
          _id: "$order.uploadedBy._id",
          companyName: { $first: "$order.uploadedBy.companyName" },
          email: { $first: "$order.uploadedBy.email" },
        },
      },
      { $sort: { companyName: 1 } },
    ]);

    return res.json({
      success: true,
      data: formatted,
      users: users.map((u) => ({
        id: u._id,
        name: u.companyName,
        email: u.email,
      })),
      counts: {
        today: countResult?.today?.[0]?.count || 0,
        future: countResult?.future?.[0]?.count || 0,
        failed: countResult?.failed?.[0]?.count || 0,
        completed: countResult?.completed?.[0]?.count || 0,
        scheduled: countResult?.scheduled?.[0]?.count || 0,
        all: countResult?.all?.[0]?.count || 0,
      },
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
