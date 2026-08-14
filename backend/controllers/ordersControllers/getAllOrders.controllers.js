const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
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

const SHIPPING_FIELDS = {
  shipmentId: 1,
  awbNumber: 1,
  courierName: 1,
  pickupLocation: 1,
  shippingStatus: 1,
  shippingCharges: 1,
  deliveryAttempts: 1,
  attemptFailureReason: 1,
  pickupDate: 1,
};

const shippingLookup = {
  $lookup: {
    from: "shippings",
    localField: "_id",
    foreignField: "orderId",
    as: "shipping",
    pipeline: [{ $project: SHIPPING_FIELDS }],
  },
};

const shippingUnwind = {
  $unwind: {
    path: "$shipping",
    preserveNullAndEmptyArrays: true,
  },
};

const formatOrder = (order) => {
  const shipping = order.shipping || null;

  return {
    order_id: order.externalOrderId,

    customer: {
      name: `${order.consigneeName} ${order.consigneeLastName}`.trim(),
      email: order.consigneeEmail,
      phone: order.billingPhone,
      alternate_phone: order.billingAlternatePhone,
    },

    shipping_address: {
      address: order.address,
      address2: order.address2,
      city: order.destinationCity,
      state: order.destinationState,
      pincode: order.destinationPincode,
      country: order.destinationCountry,
    },

    payment_method: order.paymentMethod,

    order_date: toISTDate(order.orderDate),

    pickup_date: toISTDate(shipping?.pickupDate),

    comment: order.comment,

    package: {
      weight: order.weight,
      length: order.length,
      breadth: order.breadth,
      height: order.height,
    },

    products: (order.orderItems || []).map((item) => ({
      name: item.name,
      sku: item.sku,
      quantity: item.units,
      selling_price: item.sellingPrice,
      discount: item.discount,
      tax: item.tax,
      hsn: item.hsn,
    })),

    shipment: {
      shipment_id: shipping?.shipmentId || "",
      awb: shipping?.awbNumber || "",
      courier: shipping?.courierName || "",
      pickup_location: shipping?.pickupLocation || "",
      status: shipping?.shippingStatus || "Pending",
      shipping_charges: shipping?.shippingCharges || 0,
      delivery_attempts: shipping?.deliveryAttempts || 0,
      attempt_failure_reason: shipping?.attemptFailureReason || "",
    },

    created_at: toISTDateTime(order.createdAt),
  };
};

const getAllOrders = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      sort = "DESC",
      sort_by = "createdAt",
      search,
      status,
      payment_method,
      pickup_location,
      courier_name,
      from,
      to,
    } = req.query;

    const { page, perPage, skip } = parsePagination(req.query, 20);

    const orderFilter = applyCompanyOrderFilter(req, {});

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
      const shippingOrders = await Shipping.find({
        awbNumber: {
          $regex: search,
          $options: "i",
        },
      })
        .select("orderId")
        .lean();

      orderFilter.$or = [
        {
          externalOrderId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          consigneeName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          consigneeLastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          billingPhone: {
            $regex: search,
            $options: "i",
          },
        },
        {
          _id: {
            $in: shippingOrders.map((x) => x.orderId),
          },
        },
      ];
    }

    if (payment_method) {
      orderFilter.paymentMethod = payment_method;
    }

    const sortOrder = sort.toUpperCase() === "ASC" ? 1 : -1;

    const allowedSortFields = {
      createdAt: "createdAt",
      orderDate: "orderDate",
      invoiceValue: "invoiceValue",
    };

    const sortByPickup = sort_by === "pickupDate";
    const sortField = sortByPickup
      ? "shipping.pickupDate"
      : allowedSortFields[sort_by] || "createdAt";

    const shippingMatch = {};

    if (status) {
      shippingMatch["shipping.shippingStatus"] = status;
    }

    if (pickup_location) {
      shippingMatch["shipping.pickupLocation"] = pickup_location;
    }

    if (courier_name) {
      shippingMatch["shipping.courierName"] = {
        $regex: new RegExp(
          `^${courier_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      };
    }

    const needsShippingJoin =
      Object.keys(shippingMatch).length > 0 || sortByPickup;

    let total = 0;
    let pageOrders = [];

    if (!needsShippingJoin) {
      const [count, orders] = await Promise.all([
        Order.countDocuments(orderFilter),
        Order.aggregate([
          { $match: orderFilter },
          { $sort: { [sortField]: sortOrder } },
          { $skip: skip },
          { $limit: perPage },
          shippingLookup,
          shippingUnwind,
        ]),
      ]);

      total = count;
      pageOrders = orders;
    } else {
      const basePipeline = [
        { $match: orderFilter },
        shippingLookup,
        shippingUnwind,
      ];

      if (Object.keys(shippingMatch).length > 0) {
        basePipeline.push({ $match: shippingMatch });
      }

      const [countResult, orders] = await Promise.all([
        Order.aggregate([...basePipeline, { $count: "total" }]),
        Order.aggregate([
          ...basePipeline,
          { $sort: { [sortField]: sortOrder } },
          { $skip: skip },
          { $limit: perPage },
        ]),
      ]);

      total = countResult[0]?.total || 0;
      pageOrders = orders;
    }

    const data = pageOrders.map(formatOrder);

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

module.exports = getAllOrders;
