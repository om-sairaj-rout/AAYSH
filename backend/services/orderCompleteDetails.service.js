const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Tracking = require("../models/upload/tracking.model");
const orderCalculations = require("../utils/orderCalculations");
const { toISTDate, toISTDateTime } = require("../utils/dateTime");
const { getPodAvailability } = require("../utils/shipmentPod");
const { scrubPublicTrackingText } = require("../utils/publicTrackingResponseSanitize");

const PUBLIC_TRACKING_URL_BASE = "https://aayshexpress.com/track";
const NOT_FOUND_MESSAGE = "Order not found";
const INTEGRATION_SCOPE_UNAVAILABLE =
  "Integration company scope is not configured";

const buildPublicTrackingUrl = (awbNumber) => {
  const awb = String(awbNumber || "").trim();
  if (!awb) return null;
  return `${PUBLIC_TRACKING_URL_BASE}/${encodeURIComponent(awb)}`;
};

const resolveIntegrationCompanyId = () => {
  const companyID = String(
    process.env.AISENSY_INTEGRATION_COMPANY_ID || ""
  )
    .trim()
    .toUpperCase();

  if (!companyID) {
    return {
      ok: false,
      status: 503,
      message: INTEGRATION_SCOPE_UNAVAILABLE,
    };
  }

  return { ok: true, companyID };
};

const buildIntegrationOrderLookup = (externalOrderId, companyID) => ({
  externalOrderId: String(externalOrderId || "").trim(),
  companyID,
});

const formatTrackingEvent = (row, { scrubText = false } = {}) => {
  const location = String(row.location || "").trim();
  const remarks = String(row.remarks || "").trim();
  const failureReason = String(row.failureReason || "").trim();

  return {
    status: String(row.status || "").trim(),
    location: scrubText ? scrubPublicTrackingText(location) : location,
    remarks: scrubText ? scrubPublicTrackingText(remarks) : remarks,
    failure_reason: scrubText
      ? scrubPublicTrackingText(failureReason)
      : failureReason,
    event_time: row.eventTime ? toISTDateTime(row.eventTime) : null,
  };
};

const formatProductsForIntegration = (orderItems = []) =>
  (orderItems || []).map((item) => ({
    name: item.name,
    sku: item.sku,
    quantity: item.units,
  }));

const formatOrderSectionForIntegration = (order) => ({
  order_id: order.externalOrderId,
  payment_method: order.paymentMethod,
  order_date: order.orderDate ? toISTDate(order.orderDate) : null,
  category: order.category || "",
  customer: {
    name: `${order.consigneeName || ""} ${order.consigneeLastName || ""}`.trim(),
  },
  shipping_address: {
    city: order.destinationCity || "",
    state: order.destinationState || "",
    pincode: order.destinationPincode || "",
    country: order.destinationCountry || "India",
  },
  package: {
    weight: order.weight ?? 0,
    chargeable_weight: order.chargeableWeight || order.weight || 0,
    no_of_boxes: order.noOfBoxes || 1,
  },
  products: formatProductsForIntegration(order.orderItems),
});

const formatShipmentSection = (shipping, { integration = false } = {}) => {
  if (!shipping) {
    return null;
  }

  const awb = String(shipping.awbNumber || "").trim();

  const base = {
    awb_number: awb,
    courier_name: String(shipping.courierName || "").trim(),
    shipping_status: String(shipping.shippingStatus || "Pending").trim(),
    service_type: shipping.serviceType || null,
    pickup_status: shipping.pickupStatus || "Pending",
    pickup_date: shipping.pickupDate ? toISTDate(shipping.pickupDate) : null,
    actual_pickup_date: shipping.actualPickupDate
      ? toISTDate(shipping.actualPickupDate)
      : null,
    picked_up_at: shipping.pickedUpAt ? toISTDateTime(shipping.pickedUpAt) : null,
    shipped_at: shipping.shippedAt ? toISTDateTime(shipping.shippedAt) : null,
    in_transit_at: shipping.inTransitAt ? toISTDateTime(shipping.inTransitAt) : null,
    out_for_delivery_at: shipping.outForDeliveryAt
      ? toISTDateTime(shipping.outForDeliveryAt)
      : null,
    delivered_at: shipping.deliveredAt ? toISTDateTime(shipping.deliveredAt) : null,
    delivery_date: shipping.deliveredAt ? toISTDate(shipping.deliveredAt) : null,
    total_weight: shipping.totalWeight ?? 0,
    weight: shipping.totalWeight ?? 0,
    delivery_attempts: shipping.deliveryAttempts ?? 0,
    attempt_failure_reason: integration
      ? scrubPublicTrackingText(shipping.attemptFailureReason || "")
      : shipping.attemptFailureReason || "",
    public_tracking_url: buildPublicTrackingUrl(awb),
  };

  if (integration) {
    return base;
  }

  return {
    shipment_id: shipping.shipmentId || "",
    ...base,
    pickup_location: shipping.pickupLocation || "",
    requested_pickup_date: shipping.requestedPickupDate
      ? toISTDate(shipping.requestedPickupDate)
      : null,
    booked_at: shipping.bookedAt ? toISTDateTime(shipping.bookedAt) : null,
    cancelled_at: shipping.cancelledAt ? toISTDateTime(shipping.cancelledAt) : null,
    shipping_charges: shipping.shippingCharges ?? 0,
  };
};

const fetchOrderCompleteDetails = async (externalOrderId) => {
  const orderId = String(externalOrderId || "").trim();
  if (!orderId) {
    return {
      ok: false,
      status: 400,
      message: "Order ID is required",
    };
  }

  const scope = resolveIntegrationCompanyId();
  if (!scope.ok) {
    return scope;
  }

  const order = await Order.findOne(
    buildIntegrationOrderLookup(orderId, scope.companyID)
  ).lean();

  if (!order) {
    return {
      ok: false,
      status: 404,
      message: NOT_FOUND_MESSAGE,
    };
  }

  const shipping = await Shipping.findOne({ orderId: order._id }).lean();

  let tracking = [];
  if (shipping?._id) {
    const rows = await Tracking.find({ shippingId: shipping._id })
      .select("status location remarks failureReason eventTime")
      .sort({ eventTime: 1, updatedAt: 1 })
      .lean();
    tracking = rows.map((row) =>
      formatTrackingEvent(row, { scrubText: true })
    );
  }

  const expectedInstant = shipping
    ? orderCalculations.getExpectedDeliveryDate(order, shipping)
    : null;

  const pod = shipping ? getPodAvailability(shipping) : null;

  const awb = String(shipping?.awbNumber || "").trim();

  return {
    ok: true,
    status: 200,
    payload: {
      success: true,
      data: {
        order: formatOrderSectionForIntegration(order),
        shipment: formatShipmentSection(shipping, { integration: true }),
        tracking,
        expected_delivery_date: expectedInstant
          ? toISTDateTime(expectedInstant)
          : null,
        public_tracking_url: buildPublicTrackingUrl(awb),
        pod,
      },
    },
  };
};

module.exports = {
  PUBLIC_TRACKING_URL_BASE,
  NOT_FOUND_MESSAGE,
  INTEGRATION_SCOPE_UNAVAILABLE,
  buildPublicTrackingUrl,
  resolveIntegrationCompanyId,
  buildIntegrationOrderLookup,
  formatOrderSectionForIntegration,
  formatShipmentSection,
  formatTrackingEvent,
  fetchOrderCompleteDetails,
};