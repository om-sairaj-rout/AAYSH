const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const {
  toISTDateTime,
  toISTDate,
  startOfDayIST,
  endOfDayIST,
} = require("../../utils/dateTime");

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
      page = 1,
      per_page = 20,
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

    const pageNum = Math.max(1, Number(page) || 1);
    const perPageNum = Math.min(100, Math.max(1, Number(per_page) || 20));
    const skip = (pageNum - 1) * perPageNum;

    const orderFilter = {};

    if (!isAdmin) {
      orderFilter.uploadedBy = req.user.id;
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
      const shippingOrders = await Shipping.find({
        awbNumber: {
          $regex: search,
          $options: "i",
        },
      }).select("orderId");

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
      pickupDate: "pickupDate",
      invoiceValue: "invoiceValue",
    };

    const sortField =
      sort_by === "pickupDate"
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

    const pipeline = [
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

    if (Object.keys(shippingMatch).length > 0) {
      pipeline.push({ $match: shippingMatch });
    }

    pipeline.push(
      { $sort: { [sortField]: sortOrder } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: perPageNum }],
        },
      }
    );

    const [result] = await Order.aggregate(pipeline);

    const total = result.metadata[0]?.total || 0;
    const data = (result.data || []).map(formatOrder);

    return res.status(200).json({
      success: true,
      data,
      meta: {
        pagination: {
          total,
          count: data.length,
          per_page: perPageNum,
          current_page: pageNum,
          total_pages: Math.ceil(total / perPageNum) || 1,
        },
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
