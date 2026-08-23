const Awb = require("../models/awb/awb.model");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const PincodeServiceability = require("../models/upload/serviceability.model");
const CourierPriority = require("../models/upload/courierPriority.model");
const { parseISODateOnly, now } = require("./dateTime");
const { getAwbCategory } = require("./codToPay");

const getServiceabilityPincode = (order) => {
  if (order.isReversePickup && order.pickupPincode) {
    return String(order.pickupPincode).trim();
  }
  return String(order.destinationPincode || "").trim();
};

const assignAwbCore = async ({
  serviceType,
  orders = [],
  pickupDate,
  pickupLocation,
  pickupTime = "11:00",
  notes = "",
}) => {
  const service = serviceType?.toLowerCase();

  if (!service || !orders.length) {
    return {
      success: false,
      message: "Service type and orders required",
      data: [],
      summary: { total: 0, success: 0, failed: 0 },
    };
  }

  if (!["surface", "air", "prime"].includes(service)) {
    return {
      success: false,
      message: "Invalid service type",
      data: [],
      summary: { total: 0, success: 0, failed: 0 },
    };
  }

  const parsedPickupDate = parseISODateOnly(pickupDate);
  if (!parsedPickupDate) {
    return {
      success: false,
      message: "Invalid pickupDate. Expected format YYYY-MM-DD.",
      data: [],
      summary: { total: 0, success: 0, failed: 0 },
    };
  }

  const priority = await CourierPriority.findOne({ service }).lean();
  if (!priority) {
    return {
      success: false,
      message: "Priority list not configured",
      data: [],
      summary: { total: 0, success: 0, failed: 0 },
    };
  }

  const orderIds = orders.map((o) => o.orderId);
  const existingShippings = await Shipping.find({
    orderId: { $in: orderIds },
  })
    .select("orderId awbNumber")
    .lean();

  const shippingMap = new Map(
    existingShippings.map((s) => [s.orderId.toString(), s])
  );

  const orderDocs = await Order.find({ _id: { $in: orderIds } }).lean();
  const orderMap = new Map(orderDocs.map((o) => [o._id.toString(), o]));

  const pincodes = [
    ...new Set(orderDocs.map((o) => getServiceabilityPincode(o)).filter(Boolean)),
  ];

  const serviceabilityDocs = await PincodeServiceability.find({
    pincode: { $in: pincodes },
  }).lean();

  const serviceabilityMap = new Map(
    serviceabilityDocs.map((s) => [s.pincode, s])
  );

  const shippingUpdates = [];
  const updatedOrders = [];

  for (const item of orders) {
    const existingShipping = shippingMap.get(String(item.orderId));

    if (existingShipping?.awbNumber) {
      updatedOrders.push({
        orderId: item.orderId,
        error: "AWB already assigned",
      });
      continue;
    }

    const order = orderMap.get(String(item.orderId));
    if (!order) {
      updatedOrders.push({
        orderId: item.orderId,
        error: "Order not found",
      });
      continue;
    }

    const serviceabilityPincode = getServiceabilityPincode(order);

    if (!serviceabilityPincode) {
      updatedOrders.push({
        orderId: order._id,
        orderNumber: order.externalOrderId,
        consigneeName: order.consigneeName,
        destinationPincode: "",
        error: order.isReversePickup
          ? "Order missing pickup pincode"
          : "Order missing destination pincode",
      });
      continue;
    }

    const serviceability = serviceabilityMap.get(serviceabilityPincode);

    if (!serviceability) {
      updatedOrders.push({
        orderId: order._id,
        orderNumber: order.externalOrderId,
        consigneeName: order.consigneeName,
        destinationPincode: serviceabilityPincode,
        error: order.isReversePickup
          ? "Pickup pincode is not serviceable"
          : "Destination pincode is not serviceable",
      });
      continue;
    }

    const availableCouriers = serviceability.couriers.filter((c) => c[service]);
    if (!availableCouriers.length) {
      updatedOrders.push({
        orderId: order._id,
        orderNumber: order.externalOrderId,
        consigneeName: order.consigneeName,
        destinationPincode: serviceabilityPincode,
        error: `${service} service unavailable`,
      });
      continue;
    }

    const courierMap = new Map();
    availableCouriers.forEach((c) => {
      courierMap.set(c.courierId.toString(), c);
    });

    const category = getAwbCategory(
      order.chargeableWeight || order.weight,
      service,
      order.paymentMethod
    );
    let awb = null;
    let selectedCourier = null;

    for (const priorityCourier of priority.priority) {
      if (!courierMap.has(priorityCourier.courierId.toString())) {
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
          sort: { createdAt: 1 },
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
        destinationPincode: serviceabilityPincode,
        error: "No AWB available for any courier",
      });
      continue;
    }

    shippingUpdates.push({
      updateOne: {
        filter: { orderId: order._id },
        update: {
          orderId: order._id,
          awbNumber: awb.awbNumber,
          courierId: selectedCourier.courierId,
          courierName: selectedCourier.courierName,
          serviceType: service,
          pickupDate: parsedPickupDate,
          requestedPickupDate: parsedPickupDate,
          pickupTime,
          pickupInstructions: notes,
          pickupLocation,
          pickupStatus: "Scheduled",
          shippingStatus: "Booked",
          bookedAt: now(),
          totalWeight: order.chargeableWeight || order.weight || 0,
        },
        upsert: true,
      },
    });

    updatedOrders.push({
      orderId: order.externalOrderId,
      mongoOrderId: order._id,
      consigneeName: order.consigneeName,
      destinationPincode: serviceabilityPincode,
      awbNumber: awb.awbNumber,
      courier: selectedCourier.courierName,
      serviceType: service,
      category,
    });
  }

  if (shippingUpdates.length) {
    await Shipping.bulkWrite(shippingUpdates);
  }

  const successCount = updatedOrders.filter((o) => o.awbNumber).length;
  const failedCount = updatedOrders.filter((o) => o.error).length;

  return {
    success: successCount > 0,
    message:
      successCount > 0
        ? "AWB assignment completed"
        : "No orders could be assigned.",
    data: updatedOrders,
    summary: {
      total: updatedOrders.length,
      success: successCount,
      failed: failedCount,
    },
  };
};

module.exports = {
  assignAwbCore,
  getAwbCategory,
  getServiceabilityPincode,
};
