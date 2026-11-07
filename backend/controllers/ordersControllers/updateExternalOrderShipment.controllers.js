const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const {
  applyShippingStatusWithTracking,
} = require("../../utils/shippingStatusTrackingUpdate");

const SHIPPING_STATUSES = [
  "Pending",
  "Booked",
  "Shipped",
  "In Transit",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
  "Delayed",
  "Undelivered",
];

const updateExternalOrderShipment = async (req, res) => {
  try {
    const {
      order_id,
      awb_number,
      status,
      remark,
      reason,
      failure_reason,
    } = req.body;

    const externalOrderId = String(order_id || "").trim();
    if (!externalOrderId) {
      return res.status(400).json({
        success: false,
        message: "order_id is required.",
      });
    }

    const nextStatus = String(status || "").trim();
    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message: "status is required.",
      });
    }

    if (!SHIPPING_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${SHIPPING_STATUSES.join(", ")}.`,
      });
    }

    const order = await Order.findOne({ externalOrderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (!userOwnsOrder(order, req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this order.",
      });
    }

    const shipping = await Shipping.findOne({ orderId: order._id });
    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipping record not found.",
      });
    }

    if (awb_number !== undefined) {
      const trimmedAwb = String(awb_number).trim();
      if (trimmedAwb) {
        const existingAwb = await Shipping.findOne({
          awbNumber: trimmedAwb,
          _id: { $ne: shipping._id },
        }).lean();

        if (existingAwb) {
          return res.status(400).json({
            success: false,
            message: "AWB number is already assigned to another shipment.",
          });
        }

        shipping.awbNumber = trimmedAwb;
      } else {
        shipping.awbNumber = "";
      }
    }

    const remarks = String(remark ?? reason ?? "").trim();
    const failureReason = String(failure_reason ?? "").trim();

    const { previousStatus } = await applyShippingStatusWithTracking({
      shipping,
      order,
      status: nextStatus,
      remarks,
      failureReason,
      updatedBy: req.user?.id || null,
      skipIfUnchanged: false,
    });

    if (awb_number !== undefined) {
      await shipping.save();
    }

    return res.status(200).json({
      success: true,
      message: "Shipment updated successfully.",
      order_id: order.externalOrderId,
      shipment_id: shipping.shipmentId,
      previous_status: previousStatus,
      shipping_status: shipping.shippingStatus,
      awb_number: shipping.awbNumber,
      remark: remarks,
    });
  } catch (error) {
    console.error("Update External Order Shipment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update shipment.",
    });
  }
};

module.exports = updateExternalOrderShipment;
