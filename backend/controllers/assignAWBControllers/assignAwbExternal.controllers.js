const Awb = require("../../models/awb/awb.model");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Courier = require("../../models/awb/courier.model");


const getAwbCategory = (weight, isPrime) => {
  if (isPrime) return "prime";

  if (!weight || weight > 3) {
    return "over3kg";
  }

  if (weight <= 1) {
    return "under1kg";
  }

  return "over3kg";
};

const generateAwbExternal = async (req, res) => {
  try {
    const {
  courier_name,
  is_prime = false,
  shipments,
} = req.body;

    // =========================================
    // Validation
    // =========================================

    if (!courier_name || !Array.isArray(shipments) || shipments.length === 0) {
  return res.status(400).json({
    success: false,
    message: "courier_name and shipments are required.",
  });
}

    const courier = await Courier.findOne({
      name: courier_name,
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found.",
      });
    }

    const assignedShipments = [];
    const failedShipments = [];

    // =========================================
    // Assign AWB
    // =========================================

    for (const shipmentId of shipments) {
  const shipping = await Shipping.findOne({
  shipmentId,
});

if (!shipping) {
  failedShipments.push({
    shipment_id: shipmentId,
    reason: "Shipment not found.",
  });
  continue;
}

const order = await Order.findById(shipping.orderId);

if (!order) {
  failedShipments.push({
    shipment_id: shipmentId,
    reason: "Order not found.",
  });
  continue;
}

if (shipping.awbNumber) {
  failedShipments.push({
    shipment_id: shipmentId,
    reason: "AWB already assigned.",
  });
  continue;
}


      if (shipping.shippingStatus !== "Pending") {
        failedShipments.push({
          order_id: order.externalOrderId,
          reason: `Shipping status is '${shipping.shippingStatus}'.`,
        });
        continue;
      }

      const category = getAwbCategory(
        order.weight,
        is_prime
      );

      const awb = await Awb.findOneAndUpdate(
        {
          courierId: courier._id,
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

      if (!awb) {
        failedShipments.push({
          order_id: order.externalOrderId,
          reason: `No ${category} AWB available for ${courier.name}.`,
        });
        continue;
      }


      // =========================================
      // Update Shipping
      // =========================================

      shipping.awbNumber = awb.awbNumber;
      shipping.courierId = courier._id;
      shipping.courierName = courier.name;
      shipping.shippingStatus = "Booked";
      shipping.bookedAt = new Date();
      shipping.pickupStatus = "Scheduled";

      await shipping.save();

      assignedShipments.push({
  shipment_id: shipping.shipmentId,
  order_id: order.externalOrderId,
  awb_number: awb.awbNumber,
  courier_name: courier.name,
  shipping_status: shipping.shippingStatus,
});
    }

    // =========================================
    // Response
    // =========================================

    if (assignedShipments.length === 0) {
  return res.status(400).json({
    success: false,
    message: "No AWB could be assigned.",
    failed_shipments: failedShipments,
  });
}

return res.status(200).json({
  success: true,
  message:
  failedShipments.length > 0
    ? "Some shipments were assigned successfully."
    : "AWB assigned successfully.",
  assigned_shipments: assignedShipments,
  failed_shipments: failedShipments,
});

  } catch (error) {
  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Failed to assign AWB.",
    error: error.message,
  });
}
};

module.exports = generateAwbExternal;