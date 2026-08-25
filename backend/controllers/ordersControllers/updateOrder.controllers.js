const Order = require("../../models/upload/order.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const Shipping = require("../../models/upload/shipping.model");

const getCategory = require("../../utils/categoryMapper");
const getExpectedHours = require("../../utils/tatMapper");
const {
  calculateInvoiceValue,
  calculateItemsSubTotal,
  resolveInvoiceFields,
} = require("../../utils/invoiceCalculations");
const { parseISODateOnly } = require("../../utils/dateTime");
const { resolveOrderWeights } = require("../../utils/weightCalculations");
const { parseNoOfBoxes } = require("../../utils/parseNoOfBoxes");
const {
  validateRequiredPhone,
  validateOptionalPhone,
} = require("../../utils/phone");
const { applyAdminDeliveryAttempts } = require("../../utils/deliveryAttemptService");
const { syncReversePickupFromShipping } = require("../../utils/reversePickupSync");

const SHIPPING_STATUSES = [
  "Pending",
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

const PICKUP_STATUSES = [
  "Pending",
  "Scheduled",
  "Failed",
  "Completed",
  "Cancelled",
];

/** Non-admin users may only update orders while shipping is still Pending. */
const USER_EDITABLE_SHIPPING_STATUSES = ["Pending"];

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

      invoice_no,
      invoice_value,

      shipping_charges,
      giftwrap_charges,
      transaction_charges,
      total_discount,

      weight,
      length,
      breadth,
      height,

      no_of_boxes,

      shipping_status,
      awb_number,
      pickup_date,
      pickup_time,
      pickup_status,
      courier_name,
      delivery_attempts,
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

    const isAdmin = req.user?.role === "admin";

    const ADMIN_ONLY_UPDATE_FIELDS = [
      "shipping_status",
      "awb_number",
      "pickup_date",
      "pickup_time",
      "pickup_status",
      "courier_name",
      "delivery_attempts",
    ];

    if (
      !isAdmin &&
      ADMIN_ONLY_UPDATE_FIELDS.some((field) => req.body[field] !== undefined)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only admins can update shipping status, AWB number, pickup details, and courier name.",
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

    if (
      isAdmin &&
      shipping_status !== undefined &&
      shipping_status !== null &&
      shipping_status !== "" &&
      !SHIPPING_STATUSES.includes(shipping_status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid shipping_status. Allowed values: ${SHIPPING_STATUSES.join(", ")}.`,
      });
    }

    if (
      isAdmin &&
      pickup_status !== undefined &&
      pickup_status !== null &&
      pickup_status !== "" &&
      !PICKUP_STATUSES.includes(pickup_status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid pickup_status. Allowed values: ${PICKUP_STATUSES.join(", ")}.`,
      });
    }

    if (
      isAdmin &&
      pickup_time !== undefined &&
      pickup_time !== null &&
      String(pickup_time).trim() !== "" &&
      !/^\d{2}:\d{2}$/.test(String(pickup_time).trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup_time. Expected format HH:mm.",
      });
    }

    // =========================================
    // Date Validation
    // =========================================

    let parsedOrderDate = null;
    let parsedPickupDate = null;

    if (order_date !== undefined && order_date !== null && order_date !== "") {
      parsedOrderDate = parseISODateOnly(order_date);

      if (!parsedOrderDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid order_date. Expected format YYYY-MM-DD.",
        });
      }
    }

    if (isAdmin && pickup_date !== undefined && pickup_date !== null && pickup_date !== "") {
      parsedPickupDate = parseISODateOnly(pickup_date);

      if (!parsedPickupDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid pickup_date. Expected format YYYY-MM-DD.",
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
    let parsedNoOfBoxes;

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

      if (no_of_boxes !== undefined) {
        parsedNoOfBoxes = parseNoOfBoxes(no_of_boxes);
      }
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
      if (!Array.isArray(order_items)) {
        return res.status(400).json({
          success: false,
          message: "order_items must be an array.",
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

        try {
          const units = parseNumber(
            item.units,
            `order_items[${i}].units`,
            { min: 0 }
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

    if (!isAdmin) {
      const currentShippingStatus = shipping.shippingStatus || "Pending";

      if (!USER_EDITABLE_SHIPPING_STATUSES.includes(currentShippingStatus)) {
        return res.status(403).json({
          success: false,
          message:
            "Orders can only be updated while status is Pending. This order has already been booked or shipped.",
        });
      }
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
      const phoneCheck = validateRequiredPhone(
        billing_phone,
        "Customer phone number"
      );
      if (!phoneCheck.ok) {
        return res.status(400).json({
          success: false,
          message: phoneCheck.message,
        });
      }
      order.billingPhone = phoneCheck.value;
    }

    if (billing_alternate_phone !== undefined) {
      const alternatePhoneCheck = validateOptionalPhone(
        billing_alternate_phone,
        "Alternate phone number"
      );
      if (!alternatePhoneCheck.ok) {
        return res.status(400).json({
          success: false,
          message: alternatePhoneCheck.message,
        });
      }
      order.billingAlternatePhone = alternatePhoneCheck.value;
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

    if (parsedNoOfBoxes !== undefined && parsedNoOfBoxes !== null) {
      order.noOfBoxes = parsedNoOfBoxes;
    }

    const weights = resolveOrderWeights({
      weight: order.weight,
      length: order.length,
      breadth: order.breadth,
      height: order.height,
    });
    order.actualWeight = weights.actualWeight;
    order.volumetricWeight = weights.volumetricWeight;
    order.chargeableWeight = weights.chargeableWeight;
    shipping.totalWeight = weights.chargeableWeight;

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

    order.subTotal = calculateItemsSubTotal(order.orderItems || []);

    if (invoice_no !== undefined) {
      order.invoiceNo = String(invoice_no).trim();
    }

    const invoiceValueProvided =
      invoice_value !== undefined &&
      invoice_value !== null &&
      String(invoice_value).trim() !== "";

    if (invoiceValueProvided) {
      const providedValue = Number(invoice_value);
      if (!Number.isFinite(providedValue) || providedValue < 0) {
        return res.status(400).json({
          success: false,
          message: "invoice_value must be a valid non-negative number.",
        });
      }
      order.invoiceValue = Number(providedValue.toFixed(2));
    } else {
      const calculatedInvoiceValue = calculateInvoiceValue({
        orderItems: order.orderItems || [],
        shippingCharges: order.shippingCharges,
        giftwrapCharges: order.giftwrapCharges,
        transactionCharges: order.transactionCharges,
      });

      if (calculatedInvoiceValue < 0) {
        return res.status(400).json({
          success: false,
          message: "Invoice value cannot be negative.",
        });
      }

      order.invoiceValue = calculatedInvoiceValue;
    }

    // =========================================
    // Shipping & Logistics (admin only)
    // =========================================

    if (isAdmin) {
      if (shipping_status !== undefined && shipping_status !== null && shipping_status !== "") {
        shipping.shippingStatus = shipping_status;
      }

      if (awb_number !== undefined) {
        const trimmedAwb = String(awb_number).trim();

        if (trimmedAwb) {
          const existingAwb = await Shipping.findOne({
            awbNumber: trimmedAwb,
            _id: { $ne: shipping._id },
          }).lean();

          if (existingAwb) {
            return res.status(400).json({
              success: false,
              message: "AWB number is already assigned to another shipment.",
            });
          }

          shipping.awbNumber = trimmedAwb;
        } else {
          shipping.awbNumber = "";
        }
      }

      if (pickup_date === "") {
        shipping.pickupDate = null;
      } else if (parsedPickupDate !== null) {
        shipping.pickupDate = parsedPickupDate;
      }

      if (pickup_time !== undefined) {
        shipping.pickupTime = String(pickup_time || "").trim();
      }

      if (pickup_status !== undefined && pickup_status !== null && pickup_status !== "") {
        shipping.pickupStatus = pickup_status;
      }

      if (courier_name !== undefined) {
        shipping.courierName = String(courier_name).trim();
      }

      if (delivery_attempts !== undefined) {
        try {
          applyAdminDeliveryAttempts(shipping, delivery_attempts);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }
    }

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

    if (order.isReversePickup) {
      await syncReversePickupFromShipping(order, shipping);
    }

    // =========================================
    // Response
    // =========================================

    return res.status(200).json({
      success: true,

      message: "Order updated successfully.",

      order_id: order.externalOrderId,
      shipment_id: shipping.shipmentId,

      shipping_status: shipping.shippingStatus,
      awb_number: shipping.awbNumber,
      pickup_date: shipping.pickupDate,
      pickup_time: shipping.pickupTime,
      pickup_status: shipping.pickupStatus,
      courier_name: shipping.courierName,
      no_of_boxes: order.noOfBoxes,

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