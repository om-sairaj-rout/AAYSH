const assert = require("assert");
const {
  buildPublicTrackingUrl,
  formatShipmentSection,
  formatTrackingEvent,
  formatOrderSectionForIntegration,
  resolveIntegrationCompanyId,
  buildIntegrationOrderLookup,
  NOT_FOUND_MESSAGE,
  fetchOrderCompleteDetails,
} = require("../services/orderCompleteDetails.service");

assert.strictEqual(
  buildPublicTrackingUrl("100475098683"),
  "https://aayshexpress.com/track/100475098683"
);
assert.strictEqual(buildPublicTrackingUrl(""), null);
assert.strictEqual(buildPublicTrackingUrl("   "), null);

const shipment = formatShipmentSection(
  {
    shipmentId: "SHP-1",
    awbNumber: "AWB123",
    courierName: "Delhivery",
    shippingStatus: "In Transit",
    totalWeight: 2.5,
    deliveredAt: new Date("2026-11-21T10:00:00.000Z"),
    trackonTrackingClaimToken: "secret",
    podDocument: { s3Key: "private" },
  },
  { integration: true }
);
assert.strictEqual(shipment.awb_number, "AWB123");
assert.strictEqual(shipment.courier_name, "Delhivery");
assert.strictEqual(shipment.weight, 2.5);
assert.ok(shipment.public_tracking_url.includes("AWB123"));
assert.ok(!("trackonTrackingClaimToken" in shipment));
assert.ok(!("podDocument" in shipment));
assert.ok(!("shipment_id" in shipment));

const orderSection = formatOrderSectionForIntegration({
  externalOrderId: "ORD100",
  paymentMethod: "COD",
  orderDate: new Date("2026-11-19T12:00:00.000Z"),
  companyID: "AAYSH-SECRET",
  consigneeName: "Jane",
  consigneeLastName: "Doe",
  consigneeEmail: "jane@example.com",
  billingPhone: "9876543210",
  address: "Secret Street",
  destinationCity: "Noida",
  destinationState: "UP",
  destinationPincode: "201301",
  orderItems: [{ name: "Item", sku: "S1", units: 2, sellingPrice: 100 }],
});
assert.strictEqual(orderSection.order_id, "ORD100");
assert.ok(!("company_id" in orderSection));
assert.ok(!orderSection.customer.email);
assert.ok(!orderSection.shipping_address.address);
assert.strictEqual(orderSection.products[0].quantity, 2);
assert.ok(!("selling_price" in orderSection.products[0]));

const event = formatTrackingEvent(
  {
    status: "Delivered",
    location: "Call 9876543210",
    remarks: "email test@x.com",
    failureReason: "",
    eventTime: new Date("2026-11-21T10:00:00.000Z"),
  },
  { scrubText: true }
);
assert.strictEqual(event.status, "Delivered");
assert.ok(event.event_time);
assert.ok(event.remarks.includes("[redacted]"));

assert.strictEqual(formatShipmentSection(null), null);

assert.deepStrictEqual(
  buildIntegrationOrderLookup("ORD1", "AAYSH-000008"),
  { externalOrderId: "ORD1", companyID: "AAYSH-000008" }
);

const prevCompany = process.env.AISENSY_INTEGRATION_COMPANY_ID;
delete process.env.AISENSY_INTEGRATION_COMPANY_ID;
assert.strictEqual(resolveIntegrationCompanyId().ok, false);
process.env.AISENSY_INTEGRATION_COMPANY_ID = "  aaysh-000008 ";
assert.strictEqual(resolveIntegrationCompanyId().companyID, "AAYSH-000008");
if (prevCompany !== undefined) {
  process.env.AISENSY_INTEGRATION_COMPANY_ID = prevCompany;
} else {
  delete process.env.AISENSY_INTEGRATION_COMPANY_ID;
}

assert.strictEqual(NOT_FOUND_MESSAGE, "Order not found");

const runDbIntegration = async () => {
  require("dotenv").config();
  if (!process.env.MONGODB_URI) {
    return;
  }

  const mongoose = require("mongoose");
  const Order = require("../models/upload/order.model");
  const Shipping = require("../models/upload/shipping.model");

  await mongoose.connect(process.env.MONGODB_URI);

  const trackonShip = await Shipping.findOne({
    awbNumber: "100475098683",
  }).lean();
  if (trackonShip) {
    const order = await Order.findById(trackonShip.orderId).lean();
    if (order?.companyID) {
      const prevScope = process.env.AISENSY_INTEGRATION_COMPANY_ID;
      process.env.AISENSY_INTEGRATION_COMPANY_ID = order.companyID;

      const ok = await fetchOrderCompleteDetails(order.externalOrderId);
      assert.strictEqual(ok.ok, true);
      assert.strictEqual(ok.payload.data.order.order_id, order.externalOrderId);

      process.env.AISENSY_INTEGRATION_COMPANY_ID = "AAYSH-999999";
      const wrongCompany = await fetchOrderCompleteDetails(
        order.externalOrderId
      );
      assert.strictEqual(wrongCompany.ok, false);
      assert.strictEqual(wrongCompany.status, 404);

      if (prevScope !== undefined) {
        process.env.AISENSY_INTEGRATION_COMPANY_ID = prevScope;
      } else {
        delete process.env.AISENSY_INTEGRATION_COMPANY_ID;
      }
    }
  }

  await mongoose.disconnect();
};

(async () => {
  await runDbIntegration();
  console.log("orderCompleteDetails.test.js: all assertions passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});