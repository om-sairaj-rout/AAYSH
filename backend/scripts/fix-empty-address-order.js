/**
 * Cancel/fix broken CRM Shopify test order with empty destination.
 *
 * Usage (from backend/):
 *   node scripts/fix-empty-address-order.js 3752
 *   node scripts/fix-empty-address-order.js --shipment 48904803
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");

const run = async () => {
  const args = process.argv.slice(2);
  let orderIdArg = null;
  let shipmentIdArg = null;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--shipment") {
      shipmentIdArg = args[i + 1];
      i += 1;
    } else if (!args[i].startsWith("--")) {
      orderIdArg = args[i];
    }
  }

  if (!orderIdArg && !shipmentIdArg) {
    console.error(
      "Usage: node scripts/fix-empty-address-order.js <externalOrderId> | --shipment <shipmentId>"
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  let shipping = null;
  let order = null;

  if (shipmentIdArg) {
    shipping = await Shipping.findOne({ shipmentId: String(shipmentIdArg) });
    if (shipping) {
      order = await Order.findById(shipping.orderId);
    }
  }

  if (!order && orderIdArg) {
    order = await Order.findOne({
      externalOrderId: String(orderIdArg).replace(/^#/, ""),
    });
    if (order) {
      shipping = await Shipping.findOne({ orderId: order._id });
    }
  }

  if (!order) {
    console.error("Order not found");
    process.exit(1);
  }

  console.log("Found order:", {
    _id: order._id.toString(),
    externalOrderId: order.externalOrderId,
    consigneeName: order.consigneeName,
    destinationPincode: order.destinationPincode,
    shipmentId: shipping?.shipmentId,
    shippingStatus: shipping?.shippingStatus,
    awbNumber: shipping?.awbNumber,
  });

  if (shipping?.awbNumber) {
    console.error("Order already has AWB — refuse auto-cancel. Fix manually.");
    process.exit(1);
  }

  if (shipping) {
    shipping.shippingStatus = "Cancelled";
    shipping.pickupStatus = "Cancelled";
    shipping.pickupCancelledAt = new Date();
    await shipping.save();
  }

  console.log(
    `Cancelled order ${order.externalOrderId}` +
      (shipping ? ` / shipment ${shipping.shipmentId}` : "") +
      ". Safe to recreate via CRM create-order."
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
