const mongoose = require("mongoose");
const Shipping = require("../../models/upload/shipping.model");
const {
  startOfDayIST,
  endOfDayIST,
  toISTDate,
  toISTDateTime,
} = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");

const getAllShipments = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      status,
      search,
      sort = "DESC",
      from,
      to,
    } = req.query;

    const { page, perPage, skip } = parsePagination(req.query, 20);

    const shippingFilter = {};

    if (status) {
      shippingFilter.shippingStatus = status;
    }

    if (from || to) {
      shippingFilter.createdAt = {};

      if (from) {
        shippingFilter.createdAt.$gte = startOfDayIST(from);
      }

      if (to) {
        shippingFilter.createdAt.$lte = endOfDayIST(to);
      }
    }

    if (search) {
      shippingFilter.awbNumber = {
        $regex: search,
        $options: "i",
      };
    }

    const sortOrder = sort === "ASC" ? 1 : -1;

    const orderMatch = {};

    if (!isAdmin) {
      if (req.user.companyID) {
        orderMatch["order.companyID"] = req.user.companyID;
      } else {
        orderMatch["order.uploadedBy"] = new mongoose.Types.ObjectId(req.user.id);
      }
    }

    if (search) {
      orderMatch.$or = [
        { awbNumber: { $regex: search, $options: "i" } },
        { "order.externalOrderId": { $regex: search, $options: "i" } },
      ];
      delete shippingFilter.awbNumber;
    }

    const pipeline = [
      { $match: shippingFilter },
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

    if (Object.keys(orderMatch).length > 0) {
      pipeline.push({ $match: orderMatch });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: sortOrder } },
          { $skip: skip },
          { $limit: perPage },
        ],
      },
    });

    const [result] = await Shipping.aggregate(pipeline);

    const total = result.metadata[0]?.total || 0;
    const shipments = result.data || [];

    const data = shipments.map((shipment) => ({
      shipment_id: shipment.shipmentId,
      order_id: shipment.order.externalOrderId,
      products: (shipment.order.orderItems || []).map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.units,
      })),
      awb: shipment.awbNumber,
      status: shipment.shippingStatus,
      created_at: toISTDateTime(shipment.createdAt),
      courier: shipment.courierName,
      pickup_date: toISTDate(shipment.pickupDate),
      pickup_location: shipment.pickupLocation,
      payment_method: shipment.order.paymentMethod,
      no_of_boxes: shipment.order.noOfBoxes || 1,
    }));

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

module.exports = getAllShipments;
