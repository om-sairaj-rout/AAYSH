const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const normalizePaymentMethod = (value) => {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "COD";
  if (["cod", "cash_on_delivery"].includes(raw)) return "COD";
  if (["paid", "prepaid", "pre-paid", "online"].includes(raw)) return "Prepaid";
  if (value === "COD" || value === "Prepaid") return value;
  return "COD";
};

const normalizePhone = (value) => {
  const digits = digitsOnly(value);
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

const isShopifyShape = (body = {}) =>
  Boolean(
    body.shipping &&
      typeof body.shipping === "object" &&
      (Array.isArray(body.lineItems) || body.payment !== undefined)
  );

/**
 * Normalize CRM Shopify create-order body OR legacy Aaysh body
 * into the flat fields used by Order.create / AWB assign.
 */
const normalizeCreateOrderPayload = (body = {}) => {
  const shipping = body.shipping && typeof body.shipping === "object"
    ? body.shipping
    : {};
  const billing =
    body.billing && typeof body.billing === "object" ? body.billing : {};

  const shopify = isShopifyShape(body);

  const consigneeName = String(
    shipping.firstName ||
      body.billing_customer_name ||
      billing.firstName ||
      ""
  ).trim();

  const consigneeLastName = String(
    shipping.lastName ||
      body.billing_last_name ||
      billing.lastName ||
      ""
  ).trim();

  const address = String(
    shipping.address1 || body.billing_address || billing.address1 || ""
  ).trim();

  const address2 = String(
    shipping.address2 || body.billing_address_2 || billing.address2 || ""
  ).trim();

  const destinationCity = String(
    shipping.city || body.billing_city || billing.city || ""
  ).trim();

  const destinationState = String(
    shipping.province ||
      shipping.state ||
      body.billing_state ||
      billing.province ||
      billing.state ||
      ""
  ).trim();

  const destinationPincode = String(
    shipping.zip ||
      shipping.postal_code ||
      body.billing_pincode ||
      billing.zip ||
      ""
  )
    .trim()
    .replace(/\D/g, "");

  const destinationCountry = String(
    shipping.country || body.billing_country || billing.country || "India"
  ).trim() || "India";

  const billingPhone = normalizePhone(
    body.phone ||
      shipping.phone ||
      body.billing_phone ||
      billing.phone ||
      ""
  );

  const consigneeEmail = String(
    body.email || body.billing_email || billing.email || ""
  ).trim();

  const paymentMethod = normalizePaymentMethod(
    body.payment || body.payment_method
  );

  const comment = String(body.note || body.comment || "").trim();

  let orderItems = [];

  if (Array.isArray(body.lineItems) && body.lineItems.length > 0) {
    orderItems = body.lineItems.map((item) => ({
      name: String(item.title || item.name || "").trim(),
      sku: String(item.sku || "").trim(),
      units: Number(item.quantity ?? item.units) || 1,
      selling_price: Number(item.price ?? item.selling_price) || 0,
      discount: Number(item.discount || 0) || 0,
      tax: Number(item.tax || 0) || 0,
      hsn: String(item.hsn || "").trim(),
    }));
  } else if (Array.isArray(body.order_items)) {
    orderItems = body.order_items;
  }

  return {
    shopify,
    pickup_location: String(body.pickup_location || "").trim(),
    order_id: body.order_id,
    order_id_mode: body.order_id_mode,
    order_id_sequence: body.order_id_sequence,
    company_id: body.company_id || body.companyID,
    order_date: body.order_date,
    consignor_name: body.consignor_name,
    consignor_phone: body.consignor_phone,
    consigneeName,
    consigneeLastName,
    address,
    address2,
    destinationCity,
    destinationState,
    destinationPincode,
    destinationCountry,
    consigneeEmail,
    billingPhone,
    billingAlternatePhone: String(body.billing_alternate_phone || "").trim(),
    paymentMethod,
    comment,
    orderItems,
    invoice_no: body.invoice_no,
    invoice_value: body.invoice_value,
    shipping_charges: body.shipping_charges,
    giftwrap_charges: body.giftwrap_charges,
    transaction_charges: body.transaction_charges,
    total_discount: body.total_discount,
    weight: body.weight,
    length: body.length,
    breadth: body.breadth,
    height: body.height,
    no_of_boxes: body.no_of_boxes,
    document_types: body.document_types,
    tags: Array.isArray(body.tags) ? body.tags : [],
  };
};

/**
 * Validate required fields for Shopify-shaped create payloads.
 * Legacy payloads keep existing (lighter) validation.
 */
const validateNormalizedCreateOrder = (normalized) => {
  if (!normalized.pickup_location) {
    return "Missing required field: pickup_location";
  }

  if (!normalized.shopify) {
    return null;
  }

  if (!normalized.consigneeName) {
    return "Missing required field: shipping.firstName";
  }
  if (!normalized.address) {
    return "Missing required field: shipping.address1";
  }
  if (!normalized.destinationCity) {
    return "Missing required field: shipping.city";
  }
  if (!normalized.destinationState) {
    return "Missing required field: shipping.province";
  }
  if (!/^\d{6}$/.test(normalized.destinationPincode)) {
    return "Missing or invalid shipping.zip (expected 6-digit pincode)";
  }
  if (!/^\d{10}$/.test(normalized.billingPhone)) {
    return "Missing or invalid phone (expected 10-digit mobile number)";
  }
  if (!normalized.orderItems.length) {
    return "At least one lineItems entry is required";
  }

  return null;
};

module.exports = {
  normalizeCreateOrderPayload,
  validateNormalizedCreateOrder,
  normalizePaymentMethod,
  isShopifyShape,
};
