const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");
const Company = require("../../models/company.model");
const ReversePickup = require("../../models/reversePickup.model");
const { buildOrderScopeForCompany } = require("../../utils/companyScope");
const { buildReversePickupSummary } = require("../../utils/reversePickupDocument");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { startOfDayIST, endOfDayIST, formatDatesInObject } = require("../../utils/dateTime");
const { applyOrderSearchFilter } = require("../../utils/orderSearch");
const { loadTrackingGroupedByShippingId } = require("../../utils/trackingHistoryHelpers");

const getOrdersByCompanyController = async (req, res) => {
  try {
    const { companyID } = req.params;
    const { payment_method, from, to, search, search_type } = req.query;

    if (!companyID || !String(companyID).trim()) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const normalizedCompanyID = String(companyID).trim().toUpperCase();
    const company = await Company.findOne({ companyID: normalizedCompanyID })
      .select("companyID companyName")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const { page, perPage, skip } = parsePagination(req.query, 20);

    const orderFilter = buildOrderScopeForCompany(normalizedCompanyID);

    if (payment_method && ["COD", "Prepaid"].includes(payment_method)) {
      orderFilter.paymentMethod = payment_method;
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

    if (search) {
      await applyOrderSearchFilter(orderFilter, search, search_type);
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
      {
        $sort: {
          "shipping.pickupDate": -1,
          orderDate: -1,
        },
      },
    ];

    const [pageOrders, totalResult] = await Promise.all([
      Order.aggregate([...basePipeline, { $skip: skip }, { $limit: perPage }]),
      Order.aggregate([...basePipeline, { $count: "total" }]),
    ]);

    const total = totalResult[0]?.total || 0;

    const shippingIds = pageOrders
      .map((order) => order.shipping?._id)
      .filter(Boolean);

    const reversePickupOrderIds = pageOrders
      .filter((order) => order.isReversePickup)
      .map((order) => order._id);

    const [trackingMap, reversePickupRows] = await Promise.all([
      loadTrackingGroupedByShippingId(Tracking, shippingIds),
      reversePickupOrderIds.length
        ? ReversePickup.find({
            orderId: { $in: reversePickupOrderIds },
          })
            .select(
              "orderId requestId status awbNumber supportingDocumentName supportingDocumentS3Key supportingDocumentPath fromName fromPhone fromEmail fromAddress fromAddress2 fromCity fromState fromPincode toName toPhone toAddress toCity toState toPincode"
            )
            .lean()
        : Promise.resolve([]),
    ]);

    const reversePickupMap = new Map(
      reversePickupRows.map((row) => [String(row.orderId), row])
    );

    const finalOrders = pageOrders.map((order) => {
      const { shipping: embeddedShipping, ...orderFields } = order;
      const shippingKey = embeddedShipping?._id
        ? String(embeddedShipping._id)
        : "";
      const trackingHistory = shippingKey
        ? trackingMap.get(shippingKey) || []
        : [];
      const reversePickupRequest = reversePickupMap.get(String(order._id));

      return formatDatesInObject({
        ...orderFields,
        shipping: embeddedShipping
          ? { ...embeddedShipping, trackingHistory }
          : null,
        ...(order.isReversePickup
          ? {
              reversePickup: buildReversePickupSummary(reversePickupRequest),
            }
          : {}),
      });
    });

    return res.status(200).json({
      success: true,
      company,
      orders: finalOrders,
      count: total,
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, finalOrders.length),
      },
    });
  } catch (error) {
    console.error("Get Orders By Company Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getOrdersByCompanyController;
