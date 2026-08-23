const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");
const User = require("../../models/user.model");
const {
  startOfDayIST,
  endOfDayIST,
  formatDatesInObject,
} = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { applyOrderSearchFilter } = require("../../utils/orderSearch");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const ReversePickup = require("../../models/reversePickup.model");
const { buildReversePickupSummary } = require("../../utils/reversePickupDocument");

const SHIPMENT_STATUSES = [
  "Booked",
  "Shipped",
  "In Transit",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
  "Delayed",
  "Undelivered",
];

const getOrdersController = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      status,
      statuses,
      from,
      to,
      search,
      search_type,
      payment_method,
      pickup_location,
      courier_name,
      for_shipments,
      booked_tab,
      company_id,
    } = req.query;

    const { page, perPage, skip } = parsePagination(req.query, 20);

    const orderFilter = applyCompanyOrderFilter(req, {});

    if (isAdmin && company_id && company_id !== "ALL") {
      const companyKey = String(company_id).trim();

      if (companyKey.toUpperCase().startsWith("AAYSH-")) {
        orderFilter.companyID = companyKey.toUpperCase();
      } else {
        const companyUser = await User.findById(companyKey)
          .select("companyID")
          .lean();

        if (companyUser?.companyID) {
          orderFilter.companyID = companyUser.companyID;
        } else {
          orderFilter.uploadedBy = new mongoose.Types.ObjectId(companyKey);
        }
      }
    }

    if (from || to) {
      orderFilter.orderDate = {};

      if (from) {
        orderFilter.orderDate.$gte = startOfDayIST(from);
      }

      if (to) {
        orderFilter.orderDate.$lte = endOfDayIST(to);
      }
    }

    if (payment_method) {
      orderFilter.paymentMethod = payment_method;
    }

    if (search) {
      await applyOrderSearchFilter(orderFilter, search, search_type);
    }

    const shippingMatch = {};
    const shippingMatchForCounts = {};

    if (status) {
      shippingMatch["shipping.shippingStatus"] = status;
    }

    if (statuses) {
      const statusList = String(statuses)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (statusList.length > 0) {
        shippingMatch["shipping.shippingStatus"] = { $in: statusList };
      }
    }

    if (for_shipments === "true") {
      shippingMatch["shipping.shippingStatus"] = {
        $in: SHIPMENT_STATUSES,
      };
      shippingMatchForCounts["shipping.shippingStatus"] = {
        $in: SHIPMENT_STATUSES,
      };
    }

    if (pickup_location) {
      shippingMatch["shipping.pickupLocation"] = pickup_location;
      shippingMatchForCounts["shipping.pickupLocation"] = pickup_location;
    }

    if (courier_name) {
      const courierRegex = {
        $regex: new RegExp(
          `^${courier_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      };
      shippingMatch["shipping.courierName"] = courierRegex;
      shippingMatchForCounts["shipping.courierName"] = courierRegex;
    }

    if (booked_tab === "today") {
      const todayStart = startOfDayIST(new Date());
      const todayEnd = endOfDayIST(new Date());
      shippingMatch["shipping.bookedAt"] = {
        $gte: todayStart,
        $lte: todayEnd,
      };
    }

    if (booked_tab === "previous") {
      const todayStart = startOfDayIST(new Date());
      shippingMatch["shipping.bookedAt"] = {
        $lt: todayStart,
      };
    }

    const basePipeline = [
      { $match: orderFilter },
      {
        $lookup: {
          from: "shippings",
          localField: "_id",
          foreignField: "orderId",
          as: "shipping",
        },
      },
      {
        $unwind: {
          path: "$shipping",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const countsPipeline = [
      ...basePipeline,
      ...(Object.keys(shippingMatchForCounts).length > 0
        ? [{ $match: shippingMatchForCounts }]
        : []),
      {
        $group: {
          _id: {
            $ifNull: ["$shipping.shippingStatus", "Pending"],
          },
          count: { $sum: 1 },
        },
      },
    ];

    const dataPipeline = [
      ...basePipeline,
      ...(Object.keys(shippingMatch).length > 0
        ? [{ $match: shippingMatch }]
        : []),
      { $sort: { orderDate: -1 } },
      { $skip: skip },
      { $limit: perPage },
    ];

    const [statusCountRows, pageOrders, totalResult, shipmentTabCounts] =
      await Promise.all([
        Order.aggregate(countsPipeline),
        Order.aggregate(dataPipeline),
        Order.aggregate([
          ...basePipeline,
          ...(Object.keys(shippingMatch).length > 0
            ? [{ $match: shippingMatch }]
            : []),
          { $count: "total" },
        ]),
        for_shipments === "true"
          ? (async () => {
              const todayStart = startOfDayIST(new Date());
              const todayEnd = endOfDayIST(new Date());
              const shipmentBase = [
                ...basePipeline,
                ...(Object.keys(shippingMatchForCounts).length > 0
                  ? [{ $match: shippingMatchForCounts }]
                  : []),
              ];

              const [allResult, todayResult, previousResult] =
                await Promise.all([
                  Order.aggregate([...shipmentBase, { $count: "total" }]),
                  Order.aggregate([
                    ...shipmentBase,
                    {
                      $match: {
                        "shipping.bookedAt": {
                          $gte: todayStart,
                          $lte: todayEnd,
                        },
                      },
                    },
                    { $count: "total" },
                  ]),
                  Order.aggregate([
                    ...shipmentBase,
                    {
                      $match: {
                        "shipping.bookedAt": { $lt: todayStart },
                      },
                    },
                    { $count: "total" },
                  ]),
                ]);

              return {
                "All Shipments": allResult[0]?.total || 0,
                "Today's Shipments": todayResult[0]?.total || 0,
                "Previous Shipments": previousResult[0]?.total || 0,
              };
            })()
          : Promise.resolve(null),
      ]);

    const total = totalResult[0]?.total || 0;

    const shippingIds = pageOrders
      .map((order) => order.shipping?._id)
      .filter(Boolean);

    const trackingList = shippingIds.length
      ? await Tracking.find({
          shippingId: { $in: shippingIds },
        })
          .sort({ eventTime: -1 })
          .lean()
      : [];

    const trackingMap = new Map();

    trackingList.forEach((track) => {
      const key = String(track.shippingId);

      if (!trackingMap.has(key)) {
        trackingMap.set(key, []);
      }

      trackingMap.get(key).push(track);
    });

    const reversePickupOrderIds = pageOrders
      .filter((order) => order.isReversePickup)
      .map((order) => order._id);

    const reversePickupRows = reversePickupOrderIds.length
      ? await ReversePickup.find({
          orderId: { $in: reversePickupOrderIds },
        })
          .select(
            "orderId requestId status awbNumber supportingDocumentName supportingDocumentS3Key supportingDocumentPath fromName fromPhone fromEmail fromAddress fromAddress2 fromCity fromState fromPincode toName toPhone toAddress toCity toState toPincode"
          )
          .lean()
      : [];

    const reversePickupMap = new Map(
      reversePickupRows.map((row) => [String(row.orderId), row])
    );

    const uploaderIds = [
      ...new Set(
        pageOrders
          .filter((order) => order.uploadedBy && !order.consignorPhone)
          .map((order) => order.uploadedBy)
      ),
    ];

    const uploaderRows = uploaderIds.length
      ? await User.find({ _id: { $in: uploaderIds } })
          .select("mobile_number")
          .lean()
      : [];

    const uploaderPhoneMap = new Map(
      uploaderRows.map((row) => [String(row._id), row.mobile_number || ""])
    );

    const finalOrders = pageOrders.map((order) => {
      const shipping = order.shipping || null;
      const shippingData = shipping || { shippingStatus: "Pending" };
      const trackingHistory = shipping
        ? trackingMap.get(String(shipping._id)) || []
        : [];

      const { shipping: _shipping, ...orderFields } = order;
      const reversePickupRequest = reversePickupMap.get(String(order._id));

      return formatDatesInObject({
        ...orderFields,
        consignorPhone:
          order.consignorPhone ||
          uploaderPhoneMap.get(String(order.uploadedBy)) ||
          "",
        reversePickup: buildReversePickupSummary(reversePickupRequest),
        companyDocuments: (order.documents || []).map((document, index) => ({
          index,
          documentType: document.documentType,
          fileName: document.fileName,
          uploadedAt: document.uploadedAt,
        })),
        shipping: {
          ...shippingData,
          trackingHistory,
        },
      });
    });

    const statusCounts = {};

    (statusCountRows || []).forEach((entry) => {
      statusCounts[entry._id] = entry.count;
    });

    if (shipmentTabCounts) {
      Object.assign(statusCounts, shipmentTabCounts);
    } else {
      statusCounts["All Orders"] = (statusCountRows || []).reduce(
        (sum, entry) => sum + entry.count,
        0
      );

      const todayStart = startOfDayIST(new Date());
      const todayEnd = endOfDayIST(new Date());
      const todayShipmentBase = [
        ...basePipeline,
        {
          $match: {
            "shipping.shippingStatus": { $in: SHIPMENT_STATUSES },
          },
        },
      ];
      const [todayShipmentResult] = await Order.aggregate([
        ...todayShipmentBase,
        {
          $match: {
            "shipping.bookedAt": {
              $gte: todayStart,
              $lte: todayEnd,
            },
          },
        },
        { $count: "total" },
      ]);
      statusCounts["Today's Shipments"] = todayShipmentResult?.total || 0;
    }

    return res.status(200).json({
      success: true,
      orders: finalOrders,
      counts: statusCounts,
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, finalOrders.length),
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

module.exports = getOrdersController;
