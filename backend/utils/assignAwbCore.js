const Awb = require("../models/awb/awb.model");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Company = require("../models/company.model");
const PincodeServiceability = require("../models/upload/serviceability.model");
const CourierPriority = require("../models/upload/courierPriority.model");
const { parseISODateOnly, now } = require("./dateTime");
const { getAwbCategory } = require("./codToPay");
const { resolvePincodeRateZone } = require("./resolvePincodeRateZone");
const { calculateOrderWalletCharge } = require("./orderWalletCharge");
const {
  debitForOrder,
  ensureWalletReadyForShipment,
} = require("./walletService");
const { buildCourierAssignmentOrder } = require("./buildCourierAssignmentOrder");

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

  const companyIds = [
    ...new Set(orderDocs.map((o) => String(o.companyID || "").trim().toUpperCase()).filter(Boolean)),
  ];
  const companyDocs = await Company.find({ companyID: { $in: companyIds } })
    .select("companyID walletEnabled")
    .lean();
  const companyMap = new Map(companyDocs.map((c) => [c.companyID, c]));

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

    const company = companyMap.get(String(order.companyID || "").trim().toUpperCase());
    let walletChargeForOrder = null;

    if (company?.walletEnabled && !order.walletDeductedAt) {
      const chargeResult = await calculateOrderWalletCharge(order, service);
      if (!chargeResult.success) {
        updatedOrders.push({
          orderId: order._id,
          orderNumber: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: serviceabilityPincode,
          error: chargeResult.message || "Unable to calculate wallet charge",
        });
        continue;
      }

      walletChargeForOrder = chargeResult;

      const walletReady = await ensureWalletReadyForShipment(
        order.companyID,
        chargeResult.amount
      );
      if (!walletReady.ok) {
        updatedOrders.push({
          orderId: order._id,
          orderNumber: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: serviceabilityPincode,
          error: walletReady.message,
        });
        continue;
      }
    }

    const zoneResult = await resolvePincodeRateZone({
      pincode: serviceabilityPincode,
    });

    if (!zoneResult.zone) {
      updatedOrders.push({
        orderId: order._id,
        orderNumber: order.externalOrderId,
        consigneeName: order.consigneeName,
        destinationPincode: serviceabilityPincode,
        error: zoneResult.message || "Unable to resolve destination rate zone.",
      });
      continue;
    }

    const destinationZone = zoneResult.zone;
    const category = getAwbCategory(
      order.chargeableWeight || order.weight,
      service,
      order.paymentMethod,
      destinationZone
    );
    let awb = null;
    let selectedCourier = null;

    const couriersToTry = buildCourierAssignmentOrder(
      priority.priority,
      availableCouriers
    );

    for (const priorityCourier of couriersToTry) {
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

    if (walletChargeForOrder) {
      const debitResult = await debitForOrder({
        companyID: order.companyID,
        orderId: order._id,
        amount: walletChargeForOrder.amount,
        description: `Shipment charge for order ${order.externalOrderId} (${service})`,
        meta: {
          service,
          zone: walletChargeForOrder.zone,
          externalOrderId: order.externalOrderId,
          awbNumber: awb.awbNumber,
          chargeableWeight: walletChargeForOrder.chargeableWeight,
          displayDescription: "Shipment Manifested",
        },
      });

      if (!debitResult.success) {
        updatedOrders.push({
          orderId: order._id,
          orderNumber: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: serviceabilityPincode,
          error: debitResult.message || "Insufficient wallet balance",
        });
        continue;
      }

      if (!debitResult.duplicate) {
        await Order.updateOne(
          { _id: order._id },
          {
            walletDeductedAt: new Date(),
            walletChargeAmount: walletChargeForOrder.amount,
            walletTransactionId: debitResult.transaction._id,
          }
        );
        order.walletDeductedAt = new Date();
      }
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
