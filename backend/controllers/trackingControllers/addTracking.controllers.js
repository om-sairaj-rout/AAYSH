const Tracking = require("../../models/upload/tracking.model");
const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const notifyShippingStatusWhatsApp = require("../../utils/notifyShippingStatusWhatsApp");
const {
  startDeliveryAttempt,
  failCurrentDeliveryAttempt,
  completeCurrentDeliveryAttempt,
} = require("../../utils/deliveryAttemptService");

const addTracking = async (req, res) => {
  try {
    const {
      awbNumber,
      status,
      location = "",
      remarks = "",
    } = req.body;

    if (!awbNumber || !status) {
      return res.status(400).json({
        success: false,
        message: "AWB number and status are required",
      });
    }

    const shipping = await Shipping.findOne({
      awbNumber: awbNumber.trim(),
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    // Prevent duplicate tracking entry
    const lastTracking = await Tracking.findOne({
      shippingId: shipping._id,
    }).sort({ eventTime: -1 });

    if (
      lastTracking &&
      lastTracking.status === status &&
      lastTracking.location === location.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Duplicate tracking update",
      });
    }

    const tracking = await Tracking.create({
      shippingId: shipping._id,
      status,
      location: location.trim(),
      remarks: remarks.trim(),
      updatedBy: req.user?.id || null,
    });

    // Update shipment status
    const previousStatus = shipping.shippingStatus;
    shipping.shippingStatus = status;

    switch (status) {
      case "Booked":
        if (!shipping.bookedAt)
          shipping.bookedAt = new Date();
        break;

      case "Shipped":
        if (!shipping.shippedAt)
          shipping.shippedAt = new Date();
        break;

      case "In Transit":
        break;

      case "Out For Delivery":
        if (!shipping.outForDeliveryAt) {
          shipping.outForDeliveryAt = new Date();
        }
        startDeliveryAttempt(shipping, new Date());
        break;

      case "Delivered":
        if (!shipping.deliveredAt) {
          shipping.deliveredAt = new Date();
        }
        completeCurrentDeliveryAttempt(shipping, new Date());
        break;

      case "Delivery Attempt Failed":
        failCurrentDeliveryAttempt(
          shipping,
          req.body.failureReason || remarks.trim(),
          new Date()
        );
        break;

      default:
        break;
    }

    await shipping.save();

    notifyShippingStatusWhatsApp({
      shipping,
      previousStatus,
      newStatus: status,
    }).catch((err) => {
      console.error("WhatsApp notification failed:", err.message);
    });

    // Update dashboard status
    await Order.findByIdAndUpdate(
      shipping.orderId,
      {
        courierStatus: status,
        ...(status === "Delivered" && {
          deliveryDate: shipping.deliveredAt || new Date(),
        }),
      },
      {
        new: true,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Tracking updated successfully",
      tracking,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = addTracking;