const Order = require("../models/upload/order.model");

const {
  sendShipmentStatusNotification,
  isNotificationRetriable,
} = require("../services/msg91WhatsAppService");



const NOTIFY_STATUSES = new Set(["Shipped", "Out For Delivery", "Delivered"]);



/**

 * Send WhatsApp when shipping status becomes Shipped, Out For Delivery, or Delivered.

 * Fire-and-forget from callers; errors are logged only.

 */

const notifyShippingStatusWhatsApp = async ({

  shipping,

  previousStatus,

  newStatus,

}) => {

  if (!shipping || !newStatus) return;
  if (!NOTIFY_STATUSES.has(newStatus)) return;

  const statusChanged = previousStatus !== newStatus;
  if (!statusChanged) {
    const retriable = await isNotificationRetriable(
      shipping._id,
      newStatus
    );
    if (!retriable) return;
  }

  const order = await Order.findById(shipping.orderId)
    .select(

      "externalOrderId consigneeName consigneeLastName billingPhone billingAlternatePhone"

    )

    .lean();



  if (!order) return;



  try {
    await sendShipmentStatusNotification({
      shipping,
      order,
      previousStatus,
      newStatus,
    });
  } catch (err) {
    console.error("WhatsApp notification error:", err.message);
  }
};



module.exports = notifyShippingStatusWhatsApp;

