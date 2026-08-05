const Awb = require("../../models/awb/awb.model");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const PincodeServiceability = require("../../models/pincode/pincodeServiceability.model");
const CourierPriority = require("../../models/pincode/courierPriority.model");

// ================= CATEGORY LOGIC =================
const getAwbCategory = (weight, service) => {
  if (service === "prime") return "prime";

  return weight > 3 ? "over3kg" : "under3kg";
};

const assignAwbToOrders = async (req, res) => {
  try {
    const {
  serviceType,
  orders,
  pickupDate,
  pickupLocation,
  pickupTime,
  notes,
} = req.body;

const service = serviceType?.toLowerCase();

if (!service || !orders?.length) {
  return res.status(400).json({
    success: false,
    message: "Service type and orders required",
  });
}

if (!["surface", "air", "prime"].includes(service)) {
  return res.status(400).json({
    success: false,
    message: "Invalid service type",
  });
}


    const priority = await CourierPriority.findOne({
  service,
}).lean();

if (!priority) {
  return res.status(400).json({
    success: false,
    message: "Priority list not configured",
  });
}

    const updatedOrders = [];

const orderIds = orders.map((o) => o.orderId);

// Fetch all existing shippings once
const existingShippings = await Shipping.find({
  orderId: { $in: orderIds },
})
  .select("orderId awbNumber")
  .lean();

const shippingMap = new Map(
  existingShippings.map((s) => [
    s.orderId.toString(),
    s,
  ])
);

// Fetch all orders once
const orderDocs = await Order.find({
  _id: { $in: orderIds },
}).lean();

const orderMap = new Map(
  orderDocs.map((o) => [
    o._id.toString(),
    o,
  ])
);

// Fetch all serviceability once
const pincodes = [
  ...new Set(
    orderDocs.map((o) => o.destinationPincode)
  ),
];

const serviceabilityDocs =
  await PincodeServiceability.find({
    pincode: { $in: pincodes },
  }).lean();

const serviceabilityMap = new Map(
  serviceabilityDocs.map((s) => [
    s.pincode,
    s,
  ])
);

// Store updates for bulk write
const shippingUpdates = [];
const orderUpdates = [];

for (const item of orders) {

// Check if AWB is already assigned
const existingShipping =
  shippingMap.get(item.orderId);

if (existingShipping?.awbNumber) {
  updatedOrders.push({
  orderId: item.orderId,
  error: "AWB already assigned",
});

  continue;
}

      // Get Order
const order = orderMap.get(item.orderId);

if (!order) {
  updatedOrders.push({
    orderId: item.orderId,
    error: "Order not found",
  });

  continue;
}

// Find serviceability
const serviceability =
  serviceabilityMap.get(
    order.destinationPincode
  );

if (!serviceability) {
  updatedOrders.push({
  orderId: order._id,
  orderNumber: order.externalOrderId,
  consigneeName: order.consigneeName,
  destinationPincode: order.destinationPincode,
  error: "Destination pincode is not serviceable",
});

  continue;
}


// Couriers that support this pincode + service
const availableCouriers = serviceability.couriers.filter(
  (c) => c[service]
);

if (!availableCouriers.length) {
 updatedOrders.push({
  orderId: order._id,
  orderNumber: order.externalOrderId,
  consigneeName: order.consigneeName,
  destinationPincode: order.destinationPincode,
  error: `${service} service unavailable`,
});

  continue;
}

// Fast lookup
const courierMap = new Map();

availableCouriers.forEach((c) => {
  courierMap.set(c.courierId.toString(), c);
});

// Decide category
const category = getAwbCategory(
  order.weight,
  service
);

let awb = null;
let selectedCourier = null;

// Check couriers according to priority
for (const priorityCourier of priority.priority) {

  if (
    !courierMap.has(
      priorityCourier.courierId.toString()
    )
  ) {
    continue;
  }

  awb = await Awb.findOneAndUpdate(
    {
      courierId: priorityCourier.courierId,
      category,
      status: "available",
    },
    {
      $set: {
        status: "booked",
        assignedOrder: order._id,
      },
    },
    {
      new: true,
      sort: {
        createdAt: 1,
      },
    }
  );

  if (awb) {
    selectedCourier = priorityCourier;
    break;
  }
}

if (!awb) {
  updatedOrders.push({
  orderId: order._id,
  orderNumber: order.externalOrderId,
  consigneeName: order.consigneeName,
  destinationPincode: order.destinationPincode,
  error: "No AWB available for any courier",
});

  continue;
}

// Update Shipping
shippingUpdates.push({
  updateOne: {
    filter: {
      orderId: order._id,
    },
    update: {
      orderId: order._id,
      awbNumber: awb.awbNumber,
      courierId: selectedCourier.courierId,
      courierName: selectedCourier.courierName,
      serviceType: service,
      pickupDate,
      pickupTime,
      pickupInstructions: notes,
      pickupLocation,
      pickupStatus: "Scheduled",
      shippingStatus: "Booked",
      bookedAt: new Date(),
      totalWeight: order.weight || 0,
    },
    upsert: true,
  },
});

orderUpdates.push({
  updateOne: {
    filter: {
      _id: order._id,
    },
    update: {
      pickupDate,
      pickupTime,
      pickupInstructions: notes,
      pickupLocation,
    },
  },
});

updatedOrders.push({
  orderId: order.externalOrderId,
  consigneeName: order.consigneeName,
  destinationPincode: order.destinationPincode,

  awbNumber: awb.awbNumber,
  courier: selectedCourier.courierName,
  serviceType: service,
  category,
});
    }

    if (shippingUpdates.length) {
  await Shipping.bulkWrite(shippingUpdates);
}

if (orderUpdates.length) {
  await Order.bulkWrite(orderUpdates);
}

    const successCount = updatedOrders.filter(
  (o) => o.awbNumber
).length;

if (!successCount) {
  return res.status(400).json({
    success: false,
    message: "No orders could be assigned.",
    data: updatedOrders,
  });
}

   const failedCount = updatedOrders.filter(
  (o) => o.error
).length;

return res.status(200).json({
  success: successCount > 0,
  message: "AWB assignment completed",

  summary: {
    total: updatedOrders.length,
    success: successCount,
    failed: failedCount,
  },

  data: updatedOrders,
});
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server error during AWB assignment",
    });
  }
};

module.exports = assignAwbToOrders;