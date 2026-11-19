const axios = require("axios");

const WhatsAppNotification = require("../models/whatsappNotification.model");



const NOTIFY_STATUSES = new Set(["Shipped", "Out For Delivery", "Delivered"]);



const TEMPLATE_BY_STATUS = {

  Shipped: "aaysh_shipment_confirm",

  "Out For Delivery": "aaysh_out_for_delivery",

  Delivered: "aaysh_order_delivered",

};



const DEFAULT_NAMESPACE = "d4566b28-36cf-4ac4-a7d0-4714d61032aa";

const PENDING_STALE_MS =
  Number(process.env.MSG91_PENDING_STALE_MS) || 5 * 60 * 1000;

const isMsg91Enabled = () =>

  String(process.env.MSG91_ENABLED || "").toLowerCase() === "true";



const formatPhoneForMsg91 = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;

  let localTen = null;
  if (digits.length === 10) {
    localTen = digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    localTen = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    localTen = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith("091")) {
    localTen = digits.slice(3);
  } else if (digits.length >= 10) {
    localTen = digits.slice(-10);
  }

  if (!localTen || !/^\d{10}$/.test(localTen)) {
    return null;
  }
  return `91${localTen}`;
};



const buildCustomerName = (order) =>

  `${order?.consigneeName || ""} ${order?.consigneeLastName || ""}`.trim() ||

  "Customer";



const buildMsg91Payload = ({

  toPhone,

  templateName,

  customerName,

  orderId,

  awbNumber,

}) => {

  const integratedNumber =

    process.env.MSG91_INTEGRATED_NUMBER || "917827979505";

  const namespace =

    process.env.MSG91_TEMPLATE_NAMESPACE || DEFAULT_NAMESPACE;



  return {

    integrated_number: integratedNumber,

    content_type: "template",

    payload: {

      messaging_product: "whatsapp",

      type: "template",

      template: {

        name: templateName,

        language: {

          code: "en",

          policy: "deterministic",

        },

        namespace,

        to_and_components: [

          {

            to: [toPhone],

            components: {

              body_1: {

                type: "text",

                value: customerName,

              },

              body_2: {

                type: "text",

                value: orderId,

              },

              body_3: {

                type: "text",

                value: awbNumber,

              },

              button_1: {

                subtype: "url",

                type: "text",

                value: awbNumber,

              },

            },

          },

        ],

      },

    },

  };

};



const extractProviderRequestId = (responseData) => {

  if (!responseData || typeof responseData !== "object") return "";

  return (

    responseData.request_id ||

    responseData.message_id ||

    responseData.id ||

    responseData.data?.request_id ||

    ""

  );

};



const resolveRecipientPhone = (customerPhone) => {

  const testRecipient = String(process.env.MSG91_TEST_RECIPIENT || "").trim();

  if (testRecipient) {

    return formatPhoneForMsg91(testRecipient);

  }

  return formatPhoneForMsg91(customerPhone);

};



const isPendingStale = (record) => {
  if (!record || record.messageStatus !== "pending") return false;
  const ts = record.updatedAt || record.createdAt;
  if (!ts) return true;
  return Date.now() - new Date(ts).getTime() >= PENDING_STALE_MS;
};

const isNotificationRetriable = async (shippingId, notificationEvent) => {
  const existing = await WhatsAppNotification.findOne({
    shippingId,
    notificationEvent,
  }).lean();

  if (!existing) return false;
  if (existing.messageStatus === "sent") return false;
  if (existing.messageStatus === "failed") return true;
  if (existing.messageStatus === "pending") return isPendingStale(existing);
  return false;
};

const claimNotificationSlot = async (fields) => {
  const staleCutoff = new Date(Date.now() - PENDING_STALE_MS);

  const reclaimed = await WhatsAppNotification.findOneAndUpdate(
    {
      shippingId: fields.shippingId,
      notificationEvent: fields.notificationEvent,
      messageStatus: { $ne: "sent" },
      $or: [
        { messageStatus: "failed" },
        { messageStatus: "pending", updatedAt: { $lte: staleCutoff } },
      ],
    },
    {
      $set: {
        messageStatus: "pending",
        failureReason: "",
        customerPhone: fields.customerPhone,
        awbNumber: fields.awbNumber,
        orderId: fields.orderId,
        templateName: fields.templateName,
        shipmentId: fields.shipmentId,
      },
    },
    { new: true }
  );

  if (reclaimed) {
    return { proceed: true, record: reclaimed };
  }

  const existing = await WhatsAppNotification.findOne({
    shippingId: fields.shippingId,
    notificationEvent: fields.notificationEvent,
  });

  if (existing?.messageStatus === "sent") {
    return { proceed: false, record: existing };
  }

  if (existing?.messageStatus === "pending") {
    return { proceed: false, record: existing };
  }

  try {
    const record = await WhatsAppNotification.create({
      ...fields,
      messageStatus: "pending",
    });
    return { proceed: true, record };
  } catch (err) {
    if (err.code === 11000) {
      const raced = await WhatsAppNotification.findOne({
        shippingId: fields.shippingId,
        notificationEvent: fields.notificationEvent,
      });

      if (raced?.messageStatus === "sent") {
        return { proceed: false, record: raced };
      }

      if (
        raced?.messageStatus === "failed" ||
        isPendingStale(raced)
      ) {
        return claimNotificationSlot(fields);
      }

      return { proceed: false, record: raced };
    }
    throw err;
  }
};



/**

 * Send MSG91 WhatsApp template after a successful shipping status transition.

 * Never throws to callers; failures are logged on the notification record.

 */

const sendShipmentStatusNotification = async ({

  shipping,

  order,

  previousStatus,

  newStatus,

}) => {

  if (!shipping || !order || !newStatus) {
    return;
  }

  if (!NOTIFY_STATUSES.has(newStatus)) {

    return;

  }

  if (!isMsg91Enabled()) {

    return;

  }



  const authKey = String(process.env.MSG91_AUTH_KEY || "").trim();

  if (!authKey) {

    console.log("MSG91 skipped: MSG91_AUTH_KEY not configured");

    return;

  }



  const awbNumber = String(shipping.awbNumber || "").trim();

  if (!awbNumber) {

    console.log(

      "MSG91 skipped: missing AWB for shipment",

      shipping.shipmentId || shipping._id

    );

    return;

  }



  const orderId = String(order.externalOrderId || "").trim();

  if (!orderId) {

    console.log("MSG91 skipped: missing order id on shipment", shipping._id);

    return;

  }



  const customerName = buildCustomerName(order);

  const customerPhone = order.billingPhone || order.billingAlternatePhone || "";

  const toPhone = resolveRecipientPhone(customerPhone);



  if (!toPhone) {

    console.log("MSG91 skipped: invalid customer phone for order", orderId);

    return;

  }



  const templateName = TEMPLATE_BY_STATUS[newStatus];

  const logFields = {

    shippingId: shipping._id,

    shipmentId: String(shipping.shipmentId || ""),

    customerPhone: toPhone,

    awbNumber,

    orderId,

    notificationEvent: newStatus,

    templateName,

    provider: "MSG91",

  };



  const { proceed, record } = await claimNotificationSlot(logFields);

  if (!proceed || !record) {

    return;

  }



  const apiUrl =

    process.env.MSG91_API_URL ||

    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";



  const body = buildMsg91Payload({

    toPhone,

    templateName,

    customerName,

    orderId,

    awbNumber,

  });



  try {

    const response = await axios.post(apiUrl, body, {

      headers: {

        authkey: authKey,

        "Content-Type": "application/json",

      },

      timeout: 30000,

    });



    record.messageStatus = "sent";

    record.providerRequestId = String(

      extractProviderRequestId(response.data) || ""

    );

    record.sentAt = new Date();

    record.failureReason = "";

    await record.save();

  } catch (err) {

    const reason =

      err.response?.data?.message ||

      err.response?.data?.errors ||

      err.message ||

      "MSG91 request failed";



    record.messageStatus = "failed";

    record.failureReason =

      typeof reason === "object" ? JSON.stringify(reason) : String(reason);

    await record.save();



    console.error("MSG91 WhatsApp failed:", record.failureReason);

  }

};



module.exports = {
  sendShipmentStatusNotification,
  isNotificationRetriable,
  NOTIFY_STATUSES,
  TEMPLATE_BY_STATUS,
};

