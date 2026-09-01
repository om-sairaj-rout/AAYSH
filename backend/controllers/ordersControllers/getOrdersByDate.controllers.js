const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");
const User = require("../../models/user.model");
const {
  toISTDate,
  startOfDayIST,
  endOfDayIST,
} = require("../../utils/dateTime");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const { resolveDeliveryAttempts } = require("../../utils/deliveryAttemptService");

const orderCalculations = require("../../utils/orderCalculations");

const mapOrderItemRow = (order, shipping, item, deliveryAttemptDetails) => {
  const calculations = orderCalculations(order, shipping);

  return {
    order_id: order.externalOrderId,
    order_date: toISTDate(order.orderDate),
    pickup_date: toISTDate(shipping?.pickupDate),
    pickup_location: shipping?.pickupLocation || "",
    consignor_name: order.consignorName,
    consignee_name: order.consigneeName,
    consignee_last_name: order.consigneeLastName,
    address: order.address,
    address_2: order.address2,
    destination_city: order.destinationCity,
    destination_state: order.destinationState,
    destination_pincode: order.destinationPincode,
    destination_country: order.destinationCountry,
    consignee_email: order.consigneeEmail,
    billing_phone: order.billingPhone,
    billing_alternate_phone: order.billingAlternatePhone,
    payment_method: order.paymentMethod,
    comment: order.comment,
    order_name: item.name,
    sku: item.sku,
    quantity: item.units,
    selling_price: item.sellingPrice,
    discount: item.discount,
    tax: item.tax,
    hsn: item.hsn,
    invoice_no: order.invoiceNo,
    invoice_value: order.invoiceValue,
    sub_total: order.subTotal,
    shipping_charges: shipping?.shippingCharges ?? order.shippingCharges,
    giftwrap_charges: order.giftwrapCharges,
    transaction_charges: order.transactionCharges,
    total_discount: order.totalDiscount,
    weight: order.weight,
    actual_weight: order.actualWeight,
    volumetric_weight: order.volumetricWeight,
    chargeable_weight: order.chargeableWeight || order.weight,
    length: order.length,
    breadth: order.breadth,
      height: order.height,
      no_of_boxes: order.noOfBoxes || 1,
      status: shipping?.shippingStatus || "Pending",
    awb_number: shipping?.awbNumber || "",
    courier_name: shipping?.courierName || "",
    service_type: shipping?.serviceType || "",
    delivery_attempts: deliveryAttemptDetails?.total || 0,
    delivery_attempt_list: deliveryAttemptDetails?.attempts || [],
    attempt_failure_reason: shipping?.attemptFailureReason || "",
    expected_hours: calculations.expectedHours,
    actual_hours: calculations.actualHours,
    ageing: calculations.ageing,
    category: calculations.category,
    sla_status: calculations.slaStatus,
  };
};

const buildTrackingMap = async (rows = []) => {
  const shippingIds = [
    ...new Set(
      rows
        .map((doc) => doc.shipping?._id)
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(String(id)))
    ),
  ];

  if (!shippingIds.length) {
    return new Map();
  }

  const trackingRows = await Tracking.find({
    shippingId: { $in: shippingIds },
  })
    .sort({ eventTime: 1 })
    .lean();

  const trackingMap = new Map();

  trackingRows.forEach((track) => {
    const key = String(track.shippingId);
    if (!trackingMap.has(key)) {
      trackingMap.set(key, []);
    }
    trackingMap.get(key).push(track);
  });

  return trackingMap;
};

const mapRowsToOrders = (rows, trackingMap) =>
  rows.map((doc) => {
    const shipping = doc.shipping || null;
    const shippingKey = shipping?._id ? String(shipping._id) : "";
    const trackingEvents = shippingKey
      ? trackingMap.get(shippingKey) || []
      : [];
    const deliveryAttemptDetails = resolveDeliveryAttempts(
      shipping || {},
      trackingEvents
    );

    return mapOrderItemRow(
      doc,
      shipping,
      doc.orderItems,
      deliveryAttemptDetails
    );
  });

const getOrdersByDate = async (req, res) => {
  try {
    const { fromDate, toDate, all, company_id } = req.query;

    const startDate = startOfDayIST(fromDate);
    const endDate = endOfDayIST(toDate);

    const filter = applyCompanyOrderFilter(req, {
      orderDate: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    if (req.user?.role === "admin" && company_id && company_id !== "ALL") {
      const companyKey = String(company_id).trim();

      if (companyKey.toUpperCase().startsWith("AAYSH-")) {
        filter.companyID = companyKey.toUpperCase();
      } else {
        const companyUser = await User.findById(companyKey)
          .select("companyID")
          .lean();

        if (companyUser?.companyID) {
          filter.companyID = companyUser.companyID;
        } else {
          filter.uploadedBy = new mongoose.Types.ObjectId(companyKey);
        }
      }
    }

    const fetchAll = all === "true";
    const { page, perPage, skip } = parsePagination(req.query, 20);

    const pipeline = [
      { $match: filter },
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
      { $unwind: "$orderItems" },
      { $sort: { orderDate: -1, "orderItems.name": 1 } },
    ];

    if (fetchAll) {
      const rows = await Order.aggregate(pipeline);
      const trackingMap = await buildTrackingMap(rows);
      const orders = mapRowsToOrders(rows, trackingMap);

      return res.status(200).json({
        success: true,
        orders,
        meta: {
          pagination: buildPaginationMeta(orders.length, 1, orders.length, orders.length),
        },
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: perPage }],
      },
    });

    const [result] = await Order.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;
    const rows = result.data || [];
    const trackingMap = await buildTrackingMap(rows);
    const orders = mapRowsToOrders(rows, trackingMap);

    return res.status(200).json({
      success: true,
      orders,
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, orders.length),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getOrdersByDate;
