const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const orderCalculations = require(
  "../../utils/orderCalculations"
);

const getOrdersByDate = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    let filter = {
  orderDate: {
    $gte: startDate,
    $lte: endDate,
  },
};

    if (req.user.role !== "admin") {
      filter.uploadedBy = req.user.id;
    }

    // =========================
    // FETCH ORDERS
    // =========================
    const orders = await Order.find(filter)
      .sort({
  orderDate: -1,
})
      .lean();

    // =========================
    // ATTACH SHIPPING + CALCULATIONS
    // =========================
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        const shipping = await Shipping.findOne({
          orderId: order._id,
        }).lean();

        const calculations =
  orderCalculations(order, shipping);

        return {
  order_id: order.externalOrderId,

  order_date: order.orderDate,

  pickup_date: shipping?.pickupDate || null,

  pickup_location: order.pickupLocation,

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

  order_items: order.orderItems.map((item) => ({
    order_name: item.name,
    sku: item.sku,
    quantity: item.units,
    selling_price: item.sellingPrice,
    discount: item.discount,
    tax: item.tax,
    hsn: item.hsn,
  })),

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

  attempt_failure_reason:
    shipping?.attemptFailureReason || "",

  expected_hours: calculations.expectedHours,

  sla_status: calculations.slaStatus,
};
      })
    );

    return res.status(200).json({
      success: true,
      orders: updatedOrders,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = getOrdersByDate;