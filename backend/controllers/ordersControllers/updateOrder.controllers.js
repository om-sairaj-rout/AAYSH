const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const getCategory = require("../../utils/categoryMapper");
const getExpectedHours = require("../../utils/tatMapper");

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

      shipping_is_billing,

      payment_method,

      order_items,

      sub_total,
      shipping_charges,
      giftwrap_charges,
      transaction_charges,
      total_discount,

      weight,
      length,
      breadth,
      height,
    } = req.body;

    // ============================
    // Validation
    // ============================

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "order_id is required.",
      });
    }

    if (
      payment_method !== undefined &&
      !["COD", "Prepaid"].includes(payment_method)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    if (
      order_items !== undefined &&
      (!Array.isArray(order_items) || order_items.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "order_items must be a non-empty array.",
      });
    }

    // ============================
    // Find Order
    // ============================

    const order = await Order.findOne({
      externalOrderId: order_id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const shipping = await Shipping.findOne({
      orderId: order._id,
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipping record not found.",
      });
    }

    // Save old status for response
    const oldOrderStatus = shipping.shippingStatus;

    // ============================
    // Prevent Update
    // ============================

    if (shipping.shippingStatus !== "Not Shipped") {
      return res.status(400).json({
        success: false,
        message: `Order cannot be updated because shipping status is '${shipping.shippingStatus}'.`,
      });
    }

    // ============================
    // Update Order Dates
    // ============================

    if (order_date !== undefined) {
      order.orderDate = new Date(order_date);
      order.pickupDate = new Date(order_date);
    }

    if (pickup_location !== undefined) {
      order.pickupLocation = pickup_location;
    }

    // ============================
    // Basic Details
    // ============================

    if (comment !== undefined) {
      order.comment = comment;
    }

    // ============================
    // Customer Details
    // ============================

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

    if (shipping_is_billing !== undefined) {
      order.shippingIsBilling = shipping_is_billing;
    }

    // ============================
    // Payment
    // ============================

    if (payment_method !== undefined) {
      order.paymentMethod = payment_method;
    }

    // ============================
    // Charges
    // ============================

    if (sub_total !== undefined) {
      order.subTotal = Number(sub_total);
      order.invoiceValue = Number(sub_total);
    }

    if (shipping_charges !== undefined) {
      order.shippingCharges = Number(shipping_charges);
    }

    if (giftwrap_charges !== undefined) {
      order.giftwrapCharges = Number(giftwrap_charges);
    }

    if (transaction_charges !== undefined) {
      order.transactionCharges = Number(transaction_charges);
    }

    if (total_discount !== undefined) {
      order.totalDiscount = Number(total_discount);
    }

    // ============================
    // Package
    // ============================

    if (weight !== undefined) {
      order.weight = Number(weight);
    }

    if (length !== undefined) {
      order.length = Number(length);
    }

    if (breadth !== undefined) {
      order.breadth = Number(breadth);
    }

    if (height !== undefined) {
      order.height = Number(height);
    }

    // ============================
    // Order Items
    // ============================

    if (order_items !== undefined) {
      order.orderItems = order_items.map((item) => ({
        name: item.name || "",
        sku: item.sku || "",
        units: Number(item.units || 1),
        sellingPrice: Number(item.selling_price || 0),
        discount: Number(item.discount || 0),
        tax: Number(item.tax || 0),
        hsn: String(item.hsn || ""),
      }));

      order.qty = order.orderItems.reduce(
        (total, item) => total + item.units,
        0
      );
    }

    // ============================
    // Recalculate Category & SLA
    // ============================

    order.category = getCategory(order.destinationCity);
    order.expectedHours = getExpectedHours(order.category);

    // Continue with Shipping update...

        // ============================
    // Update Shipping
    // ============================
    // ============================
    // Update Shipping
    // ============================

    if (pickup_location !== undefined) {
      shipping.pickupLocation = pickup_location;
    }

    if (weight !== undefined) {
      shipping.totalWeight = Number(weight);
    }

    if (shipping_charges !== undefined) {
      shipping.shippingCharges = Number(shipping_charges);
    }

    // ============================
    // Save Changes
    // ============================

    await order.save();
    await shipping.save();

    // ============================
    // Unsupported Fields
    // ============================

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

    // ============================
    // Success Response
    // ============================

    return res.status(200).json({
      success: true,
      partially_update: notUpdatedFields.length > 0,
      not_updated_fields: notUpdatedFields,

      order_id: order.externalOrderId,
      shipment_id: shipping.shipmentId,

      old_order_status: oldOrderStatus,
      new_order_status: shipping.shippingStatus,

      awb_code: shipping.awbNumber || "",
      courier_company_id: shipping.courierId || "",
      courier_name: shipping.courierName || "",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order.",
      error: error.message,
    });
  }
};

module.exports = updateOrder;