/**
 * Patch broken CRM order 3752 / shipment 48904803 with correct destination.
 *
 * Usage:
 *   node scripts/patch-order-3752-address.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");

const PATCH = {
  consigneeName: "Yash",
  consigneeLastName: "Srivastava",
  address: "Mahagun Mezzaria Sector 78",
  address2: "",
  destinationCity: "Noida",
  destinationState: "Uttar Pradesh",
  destinationPincode: "201305",
  destinationCountry: "India",
  billingPhone: "9118885590",
};

const run = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI missing");
  }

  await mongoose.connect(uri);

  let order = await Order.findOne({ externalOrderId: "3752" });
  let shipping = null;

  if (!order) {
    shipping = await Shipping.findOne({ shipmentId: "48904803" });
    if (shipping) {
      order = await Order.findById(shipping.orderId);
    }
  } else {
    shipping = await Shipping.findOne({ orderId: order._id });
  }

  if (!order) {
    console.error("Order 3752 / shipment 48904803 not found");
    process.exit(1);
  }

  console.log("Before:", {
    externalOrderId: order.externalOrderId,
    consigneeName: order.consigneeName,
    destinationPincode: order.destinationPincode,
    shipmentId: shipping?.shipmentId,
    shippingStatus: shipping?.shippingStatus,
    awbNumber: shipping?.awbNumber || "",
  });

  Object.assign(order, PATCH);
  await order.save();

  if (shipping && shipping.shippingStatus === "Cancelled") {
    shipping.shippingStatus = "Pending";
    shipping.pickupStatus = "Pending";
    shipping.pickupCancelledAt = null;
    await shipping.save();
  }

  const refreshed = await Order.findById(order._id).lean();
  console.log("After:", {
    externalOrderId: refreshed.externalOrderId,
    consigneeName: refreshed.consigneeName,
    consigneeLastName: refreshed.consigneeLastName,
    address: refreshed.address,
    destinationCity: refreshed.destinationCity,
    destinationState: refreshed.destinationState,
    destinationPincode: refreshed.destinationPincode,
    billingPhone: refreshed.billingPhone,
  });

  console.log("Patched. Retry AWB assign for shipment", shipping?.shipmentId || "48904803");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
