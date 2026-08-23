const Awb = require("../../models/awb/awb.model");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const PincodeServiceability = require("../../models/upload/serviceability.model");
const CourierPriority = require("../../models/upload/courierPriority.model");
const { parseISODateOnly, now } = require("../../utils/dateTime");
const { getAwbCategory } = require("../../utils/codToPay");

const generateAwbExternal = async (req, res) => {
  try {
    const {
      serviceType,
      shipments,
      pickupDate,
      pickupLocation,
      pickupTime,
      notes,
    } = req.body;

    const service = serviceType?.toLowerCase();

    // =========================================
    // Validation
    // =========================================

    if (
  !service ||
  !Array.isArray(shipments) ||
  shipments.length === 0 ||
  !pickupDate ||
  !pickupTime ||
  !pickupLocation
) {
  return res.status(400).json({
    success: false,
    message:
      "serviceType, shipments, pickupDate, pickupTime and pickupLocation are required.",
  });
}

    if (!["surface", "air", "prime"].includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type.",
      });
    }

    const parsedPickupDate = parseISODateOnly(pickupDate);
    if (!parsedPickupDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickupDate. Expected format YYYY-MM-DD.",
      });
    }

    const priority = await CourierPriority.findOne({
      service,
    }).lean();

    if (!priority) {
      return res.status(400).json({
        success: false,
        message: "Priority list not configured.",
      });
    }

    const updatedShipments = [];

    // =========================================
    // Fetch all Shipping records
    // =========================================

    const shippingDocs = await Shipping.find({
      shipmentId: { $in: shipments },
    }).lean();

    const shippingMap = new Map(
      shippingDocs.map((s) => [s.shipmentId, s])
    );

    // =========================================
    // Fetch Orders
    // =========================================

    const orderIds = shippingDocs.map((s) => s.orderId);

    const orderDocs = await Order.find({
      _id: { $in: orderIds },
    }).lean();

    const orderMap = new Map(
      orderDocs.map((o) => [
        o._id.toString(),
        o,
      ])
    );

    // =========================================
    // Fetch Serviceability
    // =========================================

    const pincodes = [
      ...new Set(
        orderDocs
          .map((o) => String(o.destinationPincode || "").trim())
          .filter(Boolean)
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

    // =========================================
    // Bulk Updates
    // =========================================

    const shippingUpdates = [];

    // =========================================
    // Assign AWB
    // =========================================

    for (const shipmentId of shipments) {
      const shipping =
        shippingMap.get(shipmentId);

      if (!shipping) {
        updatedShipments.push({
          shipmentId,
          error: "Shipment not found",
        });
        continue;
      }

      if (shipping.awbNumber) {
        updatedShipments.push({
          shipmentId,
          orderId: shipping.orderId,
          error: "AWB already assigned",
        });
        continue;
      }

      const order = orderMap.get(
        shipping.orderId.toString()
      );

      if (!order) {
        updatedShipments.push({
          shipmentId,
          error: "Order not found",
        });
        continue;
      }

      const destinationPincode = String(
        order.destinationPincode || ""
      ).trim();

      if (!destinationPincode) {
        updatedShipments.push({
          shipmentId,
          orderId: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: "",
          error: "Order missing destination pincode",
        });
        continue;
      }

      const serviceability =
        serviceabilityMap.get(destinationPincode);

      if (!serviceability) {
        updatedShipments.push({
          shipmentId,
          orderId: order.externalOrderId,
          consigneeName:
            order.consigneeName,
          destinationPincode,
          error:
            "Destination pincode is not serviceable",
        });
        continue;
      }

      // Couriers supporting requested service

      const availableCouriers =
        serviceability.couriers.filter(
          (c) => c[service]
        );

      if (!availableCouriers.length) {
        updatedShipments.push({
          shipmentId,
          orderId: order.externalOrderId,
          consigneeName:
            order.consigneeName,
          destinationPincode:
            order.destinationPincode,
          error: `${service} service unavailable`,
        });
        continue;
      }

      const courierMap = new Map();

      availableCouriers.forEach((c) => {
        courierMap.set(
          c.courierId.toString(),
          c
        );
      });

      const category =
        getAwbCategory(
          order.chargeableWeight || order.weight,
          service,
          order.paymentMethod
        );

      let awb = null;
      let selectedCourier = null;

      // Priority-based AWB allocation

      for (const priorityCourier of priority.priority) {
        if (
          !courierMap.has(
            priorityCourier.courierId.toString()
          )
        ) {
          continue;
        }

        awb =
          await Awb.findOneAndUpdate(
            {
              courierId:
                priorityCourier.courierId,
              category,
              status: "available",
            },
            {
              $set: {
                status: "booked",
                assignedOrder:
                  order._id,
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
          selectedCourier =
            priorityCourier;
          break;
        }
      }

      if (!awb) {
        updatedShipments.push({
          shipmentId,
          orderId:
            order.externalOrderId,
          consigneeName:
            order.consigneeName,
          destinationPincode:
            order.destinationPincode,
          error:
            "No AWB available for any courier",
        });

        continue;
      }

     // Shipping update
shippingUpdates.push({
  updateOne: {
    filter: {
      shipmentId,
    },
    update: {
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
  },
});

updatedShipments.push({
  shipmentId,
  orderId: order.externalOrderId,
  consigneeName: order.consigneeName,
  destinationPincode: order.destinationPincode,

  awbNumber: awb.awbNumber,
  courier: selectedCourier.courierName,
  serviceType: service,
  category,
});
    }

// Bulk updates
if (shippingUpdates.length) {
  await Shipping.bulkWrite(
    shippingUpdates
  );
}

const successCount =
  updatedShipments.filter(
    (o) => o.awbNumber
  ).length;

if (!successCount) {
  return res.status(400).json({
    success: false,
    message:
      "No shipments could be assigned.",
    data: updatedShipments,
  });
}

const failedCount =
  updatedShipments.filter(
    (o) => o.error
  ).length;

return res.status(200).json({
  success: successCount > 0,
  message:
    "AWB assignment completed",

  summary: {
    total: updatedShipments.length,
    success: successCount,
    failed: failedCount,
  },

  data: updatedShipments,
});
} catch (err) {
  console.error(err);

  return res.status(500).json({
    success: false,
    message:
      "Server error during AWB assignment",
  });
}
}

module.exports =
  generateAwbExternal;