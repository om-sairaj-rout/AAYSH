const Order = require("../models/upload/order.model");
const sendWhatsApp = require("./sendWhatsApp");

const NOTIFY_STATUSES = new Set(["Shipped", "Out For Delivery"]);

const TEMPLATE_BY_STATUS = {
  Shipped: process.env.WHATSAPP_TEMPLATE_SHIPPED || "order_shipped",
  "Out For Delivery":
    process.env.WHATSAPP_TEMPLATE_OUT_FOR_DELIVERY || "order_out_for_delivery",
};

const toTemplateParam = (value) => ({
  type: "text",
  text: String(value ?? "-").trim().slice(0, 1000) || "-",
});

const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  return digits;
};

/**
 * Send WhatsApp when shipping status becomes Shipped or Out For Delivery.
 * Fire-and-forget from callers; errors are logged only.
 */
const notifyShippingStatusWhatsApp = async ({
  shipping,
  previousStatus,
  newStatus,
}) => {
  if (!shipping || !newStatus || previousStatus === newStatus) return;
  if (!NOTIFY_STATUSES.has(newStatus)) return;

  const order = await Order.findById(shipping.orderId)
    .select(
      "externalOrderId consigneeName consigneeLastName billingPhone billingAlternatePhone"
    )
    .lean();

  if (!order) return;

  const phone = normalizePhone(
    order.billingPhone || order.billingAlternatePhone
  );
  if (!phone) {
    console.log("WhatsApp skipped: no customer phone for order", order.externalOrderId);
    return;
  }

  const customerName =
    `${order.consigneeName || ""} ${order.consigneeLastName || ""}`.trim() ||
    "Customer";

  const parameters = [
    toTemplateParam(customerName),
    toTemplateParam(order.externalOrderId),
    toTemplateParam(shipping.awbNumber),
    toTemplateParam(shipping.courierName || "Courier"),
  ];

  await sendWhatsApp(phone, TEMPLATE_BY_STATUS[newStatus], parameters);
};

module.exports = notifyShippingStatusWhatsApp;
