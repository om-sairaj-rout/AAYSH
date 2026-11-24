const { toISTDateTime, formatDatesInObject } = require("./dateTime");

const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g;

/**
 * Redact likely PII embedded in carrier free-text (phones, emails).
 * Hub/branch location strings are kept as-is.
 */
const scrubPublicTrackingText = (value) => {
  let text = String(value ?? "").trim();
  if (!text) return "";
  text = text.replace(EMAIL_PATTERN, "[redacted]");
  text = text.replace(PHONE_PATTERN, "[redacted]");
  return text.trim();
};

const pickPublicShipping = (shipping = {}) => {
  const row = {
    awbNumber: String(shipping.awbNumber || "").trim(),
    courierName: String(shipping.courierName || "").trim(),
    shippingStatus: String(shipping.shippingStatus || "").trim(),
    pickupDate: shipping.pickupDate ?? null,
  };

  if (shipping.deliveredAt) {
    row.deliveredAt =
      shipping.deliveredAt instanceof Date
        ? toISTDateTime(shipping.deliveredAt)
        : shipping.deliveredAt;
  }

  return formatDatesInObject(row);
};

const pickPublicOrder = (bundle) => {
  const order = bundle.order || {};
  const shipping = bundle.shipping || {};

  if (bundle.trackonOnly) {
    return formatDatesInObject({
      courierStatus: String(order.courierStatus || shipping.shippingStatus || "").trim(),
      externalOrderId: "",
    });
  }

  const publicOrder = {};
  const status = String(shipping.shippingStatus || "").trim();
  if (status.toLowerCase() === "delivered" && shipping.deliveredAt) {
    publicOrder.deliveryDate =
      shipping.deliveredAt instanceof Date
        ? toISTDateTime(shipping.deliveredAt)
        : shipping.deliveredAt;
  }

  return formatDatesInObject(publicOrder);
};

const pickPublicTrackingEvents = (tracking = []) => {
  const rows = (tracking || []).map((ev) =>
    formatDatesInObject({
      status: String(ev.status || "").trim(),
      location: scrubPublicTrackingText(ev.location),
      remarks: scrubPublicTrackingText(ev.remarks),
      failureReason: scrubPublicTrackingText(ev.failureReason),
      eventTime: ev.eventTime,
    })
  );

  rows.sort(
    (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
  );
  return rows;
};

/** Keys that must never appear in a public tracking JSON payload. */
const FORBIDDEN_PUBLIC_RESPONSE_KEYS = [
  "_id",
  "uploadedBy",
  "companyID",
  "consigneeName",
  "consigneeLastName",
  "consigneeEmail",
  "billingPhone",
  "billingAlternatePhone",
  "consignorName",
  "consignorPhone",
  "address",
  "address2",
  "destinationCity",
  "destinationState",
  "destinationPincode",
  "invoiceValue",
  "walletTransactionId",
  "walletChargeAmount",
  "walletDeductedAt",
  "podDocument",
  "trackonTrackingClaimToken",
  "trackonLastSyncedEventKey",
  "delhiveryTrackingClaimToken",
  "courierId",
  "shippingId",
  "updatedBy",
];

const collectObjectKeysDeep = (value, keys = new Set()) => {
  if (value == null || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeysDeep(item, keys);
    return keys;
  }
  for (const [k, v] of Object.entries(value)) {
    keys.add(k);
    collectObjectKeysDeep(v, keys);
  }
  return keys;
};

const AISENSY_PUBLIC_TOP_LEVEL_KEYS = new Set([
  "success",
  "trackonOnly",
  "order",
  "shipping",
  "tracking",
  "expectedDeliveryDate",
  "orderId",
  "matchCount",
  "page",
  "perPage",
  "totalPages",
  "shipments",
]);

const assertNoForbiddenPublicKeys = (payload) => {
  const found = collectObjectKeysDeep(payload);
  const leaked = FORBIDDEN_PUBLIC_RESPONSE_KEYS.filter((k) => found.has(k));
  return leaked;
};

const assertNoForbiddenPublicKeysDeep = (payload, allowedTopKeys = AISENSY_PUBLIC_TOP_LEVEL_KEYS) => {
  const cloned =
    payload && typeof payload === "object"
      ? JSON.parse(JSON.stringify(payload))
      : payload;
  if (cloned && typeof cloned === "object" && !Array.isArray(cloned)) {
    for (const key of Object.keys(cloned)) {
      if (allowedTopKeys.has(key)) {
        delete cloned[key];
      }
    }
  }
  return assertNoForbiddenPublicKeys(cloned);
};

module.exports = {
  scrubPublicTrackingText,
  pickPublicShipping,
  pickPublicOrder,
  pickPublicTrackingEvents,
  FORBIDDEN_PUBLIC_RESPONSE_KEYS,
  AISENSY_PUBLIC_TOP_LEVEL_KEYS,
  assertNoForbiddenPublicKeys,
  assertNoForbiddenPublicKeysDeep,
};