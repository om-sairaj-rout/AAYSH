const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const Awb = require("../../models/awb/awb.model");
const { userOwnsOrder } = require("../../utils/companyScope");

const cancelShipments = async (req, res) => {
  try {
    const { awbs } = req.body;

    if (!Array.isArray(awbs) || awbs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "awbs array is required",
      });
    }

    const isAdmin = req.user.role === "admin";

    const cancelled = [];
    const failed = [];

    for (const awbNumber of awbs) {
      try {
        const shipment = await Shipping.findOne({
          awbNumber,
        });

        if (!shipment) {
          failed.push({
            awb: awbNumber,
            reason: "Shipment not found",
          });
          continue;
        }

        const order = await Order.findById(shipment.orderId);

        if (!order) {
          failed.push({
            awb: awbNumber,
            reason: "Order not found",
          });
          continue;
        }

        if (!userOwnsOrder(order, req)) {
          failed.push({
            awb: awbNumber,
            reason: "Unauthorized",
          });
          continue;
        }

        if (shipment.shippingStatus === "Cancelled") {
          failed.push({
            awb: awbNumber,
            reason: "Shipment already cancelled",
          });
          continue;
        }

        if (
          [
            "Delivered",
            "Out For Delivery",
            "Returned",
            "RTO",
          ].includes(shipment.shippingStatus)
        ) {
          failed.push({
            awb: awbNumber,
            reason: `Shipment already ${shipment.shippingStatus}`,
          });
          continue;
        }

        shipment.shippingStatus = "Cancelled";
        shipment.cancelledAt = new Date();

        await shipment.save();

        await Awb.findOneAndUpdate(
          {
            awbNumber,
          },
          {
            status: "available",
            assignedOrder: null,
          }
        );

        cancelled.push({
          awb: awbNumber,
          shipment_id: shipment.shipmentId,
          order_id: order.externalOrderId,
          status: shipment.shippingStatus,
        });

      } catch (err) {
        failed.push({
          awb: awbNumber,
          reason: err.message,
        });
      }
    }

    if (cancelled.length === 0) {
  return res.status(400).json({
    success: false,
    message: "No shipments were cancelled",
    failed,
  });
}

return res.status(200).json({
  success: true,
  message: "Shipment cancellation completed",
  data: cancelled,
  failed,
});

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = cancelShipments;