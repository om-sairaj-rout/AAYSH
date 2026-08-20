/**
 * Sync pickupStatus for shipments already cancelled before pickup fix.
 *
 * Usage (from backend/):
 *   node scripts/sync-cancelled-pickup-status.js
 *   node scripts/sync-cancelled-pickup-status.js 3752
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");

const run = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI or MONGO_URI missing");
  }

  const orderIdArg = process.argv[2];

  await mongoose.connect(uri);

  let shippings = [];

  if (orderIdArg) {
    const order = await Order.findOne({
      externalOrderId: String(orderIdArg).trim(),
    }).lean();

    if (!order) {
      console.error(`Order ${orderIdArg} not found`);
      process.exit(1);
    }

    const shipping = await Shipping.findOne({ orderId: order._id });
    if (!shipping) {
      console.error(`Shipping for order ${orderIdArg} not found`);
      process.exit(1);
    }

    shippings = [shipping];
  } else {
    shippings = await Shipping.find({
      shippingStatus: "Cancelled",
      pickupStatus: { $nin: ["Cancelled", "Completed"] },
    });
  }

  if (!shippings.length) {
    console.log("No shipments need pickup status sync.");
    await mongoose.disconnect();
    return;
  }

  let updated = 0;

  for (const shipping of shippings) {
    shipping.pickupStatus = "Cancelled";
    shipping.pickupCancelledAt = shipping.pickupCancelledAt || shipping.cancelledAt || new Date();
    await shipping.save();
    updated += 1;

    const order = await Order.findById(shipping.orderId).select("externalOrderId").lean();
    console.log(
      `Synced pickupStatus=Cancelled for order #${order?.externalOrderId || shipping.orderId} (shipment ${shipping.shipmentId})`
    );
  }

  console.log(`Done. Updated ${updated} shipment(s).`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
