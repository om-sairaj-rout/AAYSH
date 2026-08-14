const mongoose = require("mongoose");
const Order = require("../../models/upload/order.model");
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

const orderCalculations = require("../../utils/orderCalculations");

const mapOrderItemRow = (order, shipping, item) => {
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
    length: order.length,
    breadth: order.breadth,
    height: order.height,
    status: shipping?.shippingStatus || "Pending",
    delivery_attempts: shipping?.deliveryAttempts || 0,
    attempt_failure_reason: shipping?.attemptFailureReason || "",
    expected_hours: calculations.expectedHours,
    sla_status: calculations.slaStatus,
  };
};

const getOrdersByDate = async (req, res) => {
  try {
    const { fromDate, toDate, all } = req.query;

    const startDate = startOfDayIST(fromDate);
    const endDate = endOfDayIST(toDate);

    const filter = {
      orderDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (req.user.role !== "admin") {
      filter.uploadedBy = new mongoose.Types.ObjectId(req.user.id);
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

      const orders = rows.map((doc) =>
        mapOrderItemRow(
          doc,
          doc.shipping || null,
          doc.orderItems
        )
      );

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

    const orders = rows.map((doc) =>
      mapOrderItemRow(doc, doc.shipping || null, doc.orderItems)
    );

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
