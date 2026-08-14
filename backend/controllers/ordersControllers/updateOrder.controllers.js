const Order = require("../../models/upload/order.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const Shipping = require("../../models/upload/shipping.model");

const getCategory = require("../../utils/categoryMapper");
const getExpectedHours = require("../../utils/tatMapper");
const {
  calculateInvoiceValue,
  calculateItemsSubTotal,
} = require("../../utils/invoiceCalculations");
const { parseISODateOnly } = require("../../utils/dateTime");

// =========================================
// Helpers
// =========================================

// =========================================
// Numeric validation helper
// =========================================

const parseNumber = (value, fieldName, options = {}) => {
  const { min = null } = options;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (min !== null && number < min) {
    throw new Error(`${fieldName} cannot be less than ${min}.`);
  }

  return number;
};

// =========================================
// Controller
// =========================================

const updateOrder = async (req, res) => {
  try {
    const {
      order_id,
      order_date,
      pickup_location,
      comment,

      billing_customer_name,
      billing_last_name,
      billing_address,
      billing_address_2,
      billing_city,
      billing_state,
      billing_country,
      billing_pincode,
      billing_email,
      billing_phone,
      billing_alternate_phone,

      payment_method,

      order_items,

      shipping_charges,
      giftwrap_charges,
      transaction_charges,
      total_discount,

      weight,
      length,
      breadth,
      height,
    } = req.body;

    // =========================================
    // Basic Validation
    // =========================================

    if (!order_id || !String(order_id).trim()) {
      return res.status(400).json({
        success: false,
        message: "order_id is required.",
      });
    }

    // =========================================
    // Payment Validation
    // =========================================

    if (
      payment_method !== undefined &&
      !["COD", "Prepaid"].includes(payment_method)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method. Use COD or Prepaid.",
      });
    }

    // =========================================
    // Date Validation
    // =========================================

    let parsedOrderDate = null;

    if (order_date !== undefined && order_date !== null && order_date !== "") {
      parsedOrderDate = parseISODateOnly(order_date);

      if (!parsedOrderDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid order_date. Expected format YYYY-MM-DD.",
        });
      }
    }

    // =========================================
    // Numeric Validation
    // =========================================

    let parsedShippingCharges;
    let parsedGiftwrapCharges;
    let parsedTransactionCharges;
    let parsedTotalDiscount;

    let parsedWeight;
    let parsedLength;
    let parsedBreadth;
    let parsedHeight;

    try {
      parsedShippingCharges = parseNumber(
        shipping_charges,
        "shipping_charges",
        { min: 0 }
      );

      parsedGiftwrapCharges = parseNumber(
        giftwrap_charges,
        "giftwrap_charges",
        { min: 0 }
      );

      parsedTransactionCharges = parseNumber(
        transaction_charges,
        "transaction_charges",
        { min: 0 }
      );

      parsedTotalDiscount = parseNumber(
        total_discount,
        "total_discount",
        { min: 0 }
      );

      parsedWeight = parseNumber(weight, "weight", { min: 0 });

      parsedLength = parseNumber(length, "length", { min: 0 });

      parsedBreadth = parseNumber(breadth, "breadth", { min: 0 });

      parsedHeight = parseNumber(height, "height", { min: 0 });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // =========================================
    // Order Items Validation
    // =========================================

    if (order_items !== undefined) {
      if (!Array.isArray(order_items) || order_items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "order_items must be a non-empty array.",
        });
      }

      for (let i = 0; i < order_items.length; i++) {
        const item = order_items[i];

        if (!item || typeof item !== "object") {
          return res.status(400).json({
            success: false,
            message: `Invalid order item at index ${i}.`,
          });
        }

        if (!item.name || !String(item.name).trim()) {
          return res.status(400).json({
            success: false,
            message: `Item name is required at index ${i}.`,
          });
        }

        try {
          const units = parseNumber(
            item.units,
            `order_items[${i}].units`,
            { min: 1 }
          );

          const sellingPrice = parseNumber(
            item.selling_price,
            `order_items[${i}].selling_price`,
            { min: 0 }
          );

          const discount = parseNumber(
            item.discount,
            `order_items[${i}].discount`,
            { min: 0 }
          );

          const tax = parseNumber(
            item.tax,
            `order_items[${i}].tax`,
            { min: 0 }
          );

          // Just force validation.
          // Values are parsed again when mapping below.
          void units;
          void sellingPrice;
          void discount;
          void tax;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }
    }

    // =========================================
    // Find Order
    // =========================================

    const order = await Order.findOne({
      externalOrderId: order_id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const isAdmin = req.user?.role === "admin";

    if (!userOwnsOrder(order, req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this order.",
      });
    }

    // =========================================
    // Find Shipping
    // =========================================

    const shipping = await Shipping.findOne({
      orderId: order._id,
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipping record not found.",
      });
    }

    // =========================================
    // Update Order Date
    // =========================================

    if (parsedOrderDate !== null) {
      order.orderDate = parsedOrderDate;
    }

    // =========================================
    // Basic Details
    // =========================================

    if (pickup_location !== undefined) {
      shipping.pickupLocation = pickup_location;
    }

    if (comment !== undefined) {
      order.comment = comment;
    }

    // =========================================
    // Customer Details
    // =========================================

    if (billing_customer_name !== undefined) {
      order.consigneeName = billing_customer_name;
    }

    if (billing_last_name !== undefined) {
      order.consigneeLastName = billing_last_name;
    }

    if (billing_address !== undefined) {
      order.address = billing_address;
    }

    if (billing_address_2 !== undefined) {
      order.address2 = billing_address_2;
    }

    if (billing_city !== undefined) {
      order.destinationCity = billing_city;
    }

    if (billing_state !== undefined) {
      order.destinationState = billing_state;
    }

    if (billing_country !== undefined) {
      order.destinationCountry = billing_country;
    }

    if (billing_pincode !== undefined) {
      order.destinationPincode = billing_pincode;
    }

    if (billing_email !== undefined) {
      order.consigneeEmail = billing_email;
    }

    if (billing_phone !== undefined) {
      order.billingPhone = billing_phone;
    }

    if (billing_alternate_phone !== undefined) {
      order.billingAlternatePhone = billing_alternate_phone;
    }

    // =========================================
    // Payment
    // =========================================

    if (payment_method !== undefined) {
      order.paymentMethod = payment_method;
    }

    // =========================================
    // Charges
    // =========================================

    if (
      parsedShippingCharges !== undefined &&
      parsedShippingCharges !== null
    ) {
      order.shippingCharges = parsedShippingCharges;
      shipping.shippingCharges = parsedShippingCharges;
    }

    if (
      parsedGiftwrapCharges !== undefined &&
      parsedGiftwrapCharges !== null
    ) {
      order.giftwrapCharges = parsedGiftwrapCharges;
    }

    if (
      parsedTransactionCharges !== undefined &&
      parsedTransactionCharges !== null
    ) {
      order.transactionCharges = parsedTransactionCharges;
    }

    if (
      parsedTotalDiscount !== undefined &&
      parsedTotalDiscount !== null
    ) {
      order.totalDiscount = parsedTotalDiscount;
    }

    // =========================================
    // Package
    // =========================================

    if (parsedWeight !== undefined && parsedWeight !== null) {
      order.weight = parsedWeight;
      shipping.totalWeight = parsedWeight;
    }

    if (parsedLength !== undefined && parsedLength !== null) {
      order.length = parsedLength;
    }

    if (parsedBreadth !== undefined && parsedBreadth !== null) {
      order.breadth = parsedBreadth;
    }

    if (parsedHeight !== undefined && parsedHeight !== null) {
      order.height = parsedHeight;
    }

    // =========================================
    // Order Items
    // =========================================

    if (order_items !== undefined) {
      order.orderItems = order_items.map((item) => ({
        name: String(item.name || "").trim(),
        sku: String(item.sku || "").trim(),

        units: Number(item.units),
        sellingPrice: Number(item.selling_price),
        discount: Number(item.discount ?? 0),
        tax: Number(item.tax ?? 0),

        hsn: String(item.hsn || "").trim(),
      }));
    }

    // =========================================
    // Recalculate Category & SLA
    // =========================================

    order.category = getCategory(
      order.destinationCity,
      order.destinationState
    );

    const serviceType = shipping.serviceType || "surface";

    order.expectedHours = getExpectedHours(
      order.category,
      serviceType
    );

    // =========================================
    // Recalculate Subtotal & Invoice Value
    // =========================================

    if (!order.orderItems?.length) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item.",
      });
    }

    order.subTotal = calculateItemsSubTotal(order.orderItems);

    const invoiceValue = calculateInvoiceValue({
      orderItems: order.orderItems,
      shippingCharges: order.shippingCharges,
      giftwrapCharges: order.giftwrapCharges,
      transactionCharges: order.transactionCharges,
    });

    if (invoiceValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice value cannot be negative.",
      });
    }

    order.invoiceValue = invoiceValue;

    // =========================================
    // Unsupported Fields
    // =========================================

    const unsupportedFields = [
      "channel_id",
      "shipping_customer_name",
      "shipping_last_name",
      "shipping_address",
      "shipping_address_2",
      "shipping_city",
      "shipping_state",
      "shipping_country",
      "shipping_pincode",
      "shipping_email",
      "shipping_phone",
      "customer_gstin",
      "ewaybill_no",
      "company_name",
      "reseller_name",
      "billing_isd_code",
      "is_document",
    ];

    const notUpdatedFields = unsupportedFields.filter(
      (field) => req.body[field] !== undefined
    );

    // =========================================
    // Save
    // =========================================

    await order.save();
    await shipping.save();

    // =========================================
    // Response
    // =========================================

    return res.status(200).json({
      success: true,

      message: "Order updated successfully.",

      order_id: order.externalOrderId,
      shipment_id: shipping.shipmentId,

      shipping_status: shipping.shippingStatus,

      invoice_value: order.invoiceValue,
      sub_total: order.subTotal,

      not_updated_fields: notUpdatedFields,
    });
  } catch (error) {
    console.error("Update Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order.",
      error: error.message,
    });
  }
};

module.exports = updateOrder;