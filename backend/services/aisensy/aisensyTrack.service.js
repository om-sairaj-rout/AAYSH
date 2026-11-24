const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");
const orderCalculations = require("../../utils/orderCalculations");
const { toISTDate, toISTDateTime } = require("../../utils/dateTime");
const {
  normalizeIndianMobileForLookup,
  isLegacyPhoneStorage,
} = require("../../utils/phone");
const {
  fetchAwbTrackingBundle,
  formatPublicTrackingResponse,
} = require("../../utils/buildAwbTrackingResponse");
const { assertNoForbiddenPublicKeys } = require("../../utils/publicTrackingResponseSanitize");

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 20;

const GENERIC_NOT_FOUND = "No shipment found for this request";

const isPlainScalar = (value) =>
  value == null || ["string", "number", "boolean"].includes(typeof value);

const parseAisensyTrackRequest = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Invalid request body" };
  }

  const { phone, orderId, awb, page, perPage } = body;

  if (!isPlainScalar(phone) || !isPlainScalar(orderId) || !isPlainScalar(awb)) {
    return { ok: false, status: 400, message: "Invalid request parameters" };
  }
  if (!isPlainScalar(page) && page != null) {
    return { ok: false, status: 400, message: "Invalid request parameters" };
  }
  if (!isPlainScalar(perPage) && perPage != null) {
    return { ok: false, status: 400, message: "Invalid request parameters" };
  }

  const phoneNorm = normalizeIndianMobileForLookup(phone);
  if (!phoneNorm.ok) {
    return { ok: false, status: 400, message: phoneNorm.message };
  }

  const orderIdStr = String(orderId || "").trim();
  const awbStr = String(awb || "").trim();

  if (orderIdStr && awbStr) {
    return {
      ok: false,
      status: 400,
      message: "Provide either orderId or awb, not both",
    };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPageNum = Math.min(
    MAX_PER_PAGE,
    Math.max(1, parseInt(perPage, 10) || DEFAULT_PER_PAGE)
  );

  return {
    ok: true,
    phone: phoneNorm.value,
    orderId: orderIdStr,
    awb: awbStr,
    page: pageNum,
    perPage: perPageNum,
  };
};

const phoneMatchQuery = (phone10) => ({
  $or: [{ billingPhone: phone10 }, { billingAlternatePhone: phone10 }],
});

const orderMatchesPhone = (order, phone10) =>
  String(order?.billingPhone || "").trim() === phone10 ||
  String(order?.billingAlternatePhone || "").trim() === phone10;

const buildSummaryRow = (order, shipping) => {
  const awbNumber = String(shipping?.awbNumber || "").trim();
  const expectedDeliveryDate = orderCalculations.getExpectedDeliveryDate(
    order,
    shipping || {}
  );
  const status = shipping
    ? String(shipping.shippingStatus || "Pending").trim()
    : "Pending";

  return {
    orderId: String(order.externalOrderId || "").trim(),
    awbNumber,
    courierName: String(shipping?.courierName || "").trim(),
    shippingStatus: status,
    orderDate: order.orderDate ? toISTDate(order.orderDate) : toISTDate(order.createdAt),
    pickupDate: shipping?.pickupDate ? toISTDate(shipping.pickupDate) : null,
    expectedDeliveryDate: expectedDeliveryDate
      ? toISTDateTime(expectedDeliveryDate)
      : null,
    hasTracking: Boolean(awbNumber),
  };
};

const fetchShipmentListByPhone = async ({ phone, page, perPage }) => {
  const filter = phoneMatchQuery(phone);
  const total = await Order.countDocuments(filter);

  if (total === 0) {
    return {
      ok: true,
      status: 200,
      payload: {
        success: true,
        matchCount: 0,
        page,
        perPage,
        totalPages: 0,
        shipments: [],
      },
    };
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .select(
      "externalOrderId orderDate createdAt billingPhone billingAlternatePhone category expectedHours destinationCity destinationState"
    )
    .lean();

  const orderIds = orders.map((o) => o._id);
  const shippings = await Shipping.find({ orderId: { $in: orderIds } })
    .select(
      "orderId awbNumber courierName shippingStatus pickupDate actualPickupDate serviceType shippedAt"
    )
    .lean();

  const shippingByOrderId = new Map(
    shippings.map((s) => [String(s.orderId), s])
  );

  const shipments = orders.map((order) =>
    buildSummaryRow(order, shippingByOrderId.get(String(order._id)) || null)
  );

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    ok: true,
    status: 200,
    payload: {
      success: true,
      matchCount: total,
      page,
      perPage,
      totalPages,
      shipments,
    },
  };
};

const loadBundleForOwnedOrder = async (order) => {
  const shipping = await Shipping.findOne({ orderId: order._id }).lean();
  if (!shipping) {
    return { ok: false, status: 404, message: GENERIC_NOT_FOUND };
  }

  const awb = String(shipping.awbNumber || "").trim();
  if (awb) {
    return fetchAwbTrackingBundle(awb, { allowTrackonFallback: false });
  }

  const tracking = await Tracking.find({ shippingId: shipping._id })
    .sort({ updatedAt: 1 })
    .lean();

  const expectedDeliveryDate = orderCalculations.getExpectedDeliveryDate(
    order,
    shipping
  );

  return {
    ok: true,
    order,
    shipping,
    tracking,
    expectedDeliveryDate: expectedDeliveryDate
      ? toISTDateTime(expectedDeliveryDate)
      : null,
  };
};

const formatDetailResponse = (bundle, orderId) => {
  const formatted = formatPublicTrackingResponse(bundle);
  const leaked = assertNoForbiddenPublicKeys(formatted);
  if (leaked.length) {
    const err = new Error("Public tracking payload failed privacy checks");
    err.code = "PUBLIC_TRACKING_LEAK";
    throw err;
  }
  return {
    ...formatted,
    orderId: String(orderId || "").trim(),
  };
};

const fetchDetailByOrderId = async ({ phone, orderId }) => {
  const order = await Order.findOne({
    externalOrderId: orderId,
  }).lean();

  if (!order || !orderMatchesPhone(order, phone)) {
    return { ok: false, status: 404, message: GENERIC_NOT_FOUND };
  }

  const bundle = await loadBundleForOwnedOrder(order);
  if (!bundle.ok) {
    return bundle;
  }

  return {
    ok: true,
    status: 200,
    payload: formatDetailResponse(bundle, order.externalOrderId),
  };
};

const fetchDetailByAwb = async ({ phone, awb }) => {
  const shipping = await Shipping.findOne({ awbNumber: awb }).lean();
  if (!shipping) {
    return { ok: false, status: 404, message: GENERIC_NOT_FOUND };
  }

  const order = await Order.findById(shipping.orderId).lean();
  if (!order || !orderMatchesPhone(order, phone)) {
    return { ok: false, status: 404, message: GENERIC_NOT_FOUND };
  }

  const bundle = await fetchAwbTrackingBundle(awb, {
    allowTrackonFallback: false,
  });
  if (!bundle.ok) {
    return { ok: false, status: bundle.status || 404, message: GENERIC_NOT_FOUND };
  }

  return {
    ok: true,
    status: 200,
    payload: formatDetailResponse(bundle, order.externalOrderId),
  };
};

const handleAisensyTrackRequest = async (body) => {
  const parsed = parseAisensyTrackRequest(body);
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.orderId) {
    return fetchDetailByOrderId({
      phone: parsed.phone,
      orderId: parsed.orderId,
    });
  }

  if (parsed.awb) {
    return fetchDetailByAwb({ phone: parsed.phone, awb: parsed.awb });
  }

  return fetchShipmentListByPhone({
    phone: parsed.phone,
    page: parsed.page,
    perPage: parsed.perPage,
  });
};

module.exports = {
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  GENERIC_NOT_FOUND,
  parseAisensyTrackRequest,
  orderMatchesPhone,
  buildSummaryRow,
  handleAisensyTrackRequest,
  fetchShipmentListByPhone,
  fetchDetailByOrderId,
  fetchDetailByAwb,
  isLegacyPhoneStorage,
};