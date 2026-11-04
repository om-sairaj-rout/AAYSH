const Shipping = require("../../models/upload/shipping.model");
const {
  toISTDateTime,
  toISTDate,
  startOfDayIST,
  endOfDayIST,
} = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");

const formatShipmentListRow = (shipping, order) => ({
  shipment_id: shipping.shipmentId,
  order_id: order.externalOrderId,
  products: (order.orderItems || []).map((item) => ({
    name: item.name,
    sku: item.sku,
    quantity: item.units,
  })),
  awb: shipping.awbNumber || "",
  status: shipping.shippingStatus || "Pending",
  created_at: toISTDateTime(shipping.createdAt),
  courier: shipping.courierName || "",
  pickup_date: toISTDate(shipping.pickupDate),
  pickup_location: shipping.pickupLocation || "",
  payment_method: order.paymentMethod,
});

const buildCompanyOrderMatch = (req) => {
  const orderFilter = applyCompanyOrderFilter(req, {});
  const match = {};

  if (orderFilter.companyID) {
    match["order.companyID"] = orderFilter.companyID;
  }
  if (orderFilter.uploadedBy) {
    match["order.uploadedBy"] = orderFilter.uploadedBy;
  }

  return match;
};

const getExternalShipments = async (req, res) => {
  try {
    const {
      sort = "DESC",
      search,
      status,
      from,
      to,
    } = req.query;

    const { page, perPage, skip } = parsePagination(req.query, 20);
    const sortOrder = String(sort).toUpperCase() === "ASC" ? 1 : -1;

    const pipeline = [
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: {
          path: "$order",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    const companyMatch = buildCompanyOrderMatch(req);
    if (Object.keys(companyMatch).length) {
      pipeline.push({ $match: companyMatch });
    }

    const filters = {};

    if (status) {
      filters.shippingStatus = String(status).trim();
    }

    if (from || to) {
      filters.createdAt = {};
      if (from) {
        filters.createdAt.$gte = startOfDayIST(from);
      }
      if (to) {
        filters.createdAt.$lte = endOfDayIST(to);
      }
    }

    if (search) {
      const term = String(search).trim();
      const regex = { $regex: term, $options: "i" };
      filters.$or = [
        { awbNumber: regex },
        { "order.externalOrderId": regex },
      ];
    }

    if (Object.keys(filters).length) {
      pipeline.push({ $match: filters });
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    const listPipeline = [
      ...pipeline,
      { $sort: { createdAt: sortOrder } },
      { $skip: skip },
      { $limit: perPage },
    ];

    const [countResult, rows] = await Promise.all([
      Shipping.aggregate(countPipeline),
      Shipping.aggregate(listPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const data = rows.map((row) =>
      formatShipmentListRow(row, row.order)
    );

    return res.status(200).json({
      success: true,
      data,
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, data.length),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getExternalShipments;
