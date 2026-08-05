const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");

const reschedulePickupExternal = async (req, res) => {
  try {
    const {
      shipmentId,
      pickupDate,
      pickupLocation,
      pickupTime,
      notes,
    } = req.body;

    // ==========================
    // Validation
    // ==========================

    if (
      !shipmentId ||
      !pickupDate ||
      !pickupLocation ||
      !pickupTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "shipmentId, pickupDate, pickupLocation and pickupTime are required.",
      });
    }

    const shipping = await Shipping.findOne({
      shipmentId,
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found.",
      });
    }

    if (!["Pending", "Scheduled", "Failed"].includes(shipping.pickupStatus)) {
      return res.status(400).json({
        success: false,
        message: `Pickup cannot be rescheduled because pickup status is '${shipping.pickupStatus}'.`,
      });
    }

    // Optional: don't allow after shipment is already shipped
    if (
      !["Pending", "Booked"].includes(shipping.shippingStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: `Pickup cannot be rescheduled because shipping status is '${shipping.shippingStatus}'.`,
      });
    }

    shipping.pickupDate = pickupDate;
    shipping.pickupTime = pickupTime;
    shipping.pickupLocation = pickupLocation;
    shipping.pickupInstructions = notes || "";
    shipping.pickupStatus = "Scheduled";
    shipping.failureReason = "";
    shipping.pickedUpAt = null;

    await shipping.save();

    // Keep Order pickup details in sync
    await Order.findByIdAndUpdate(
      shipping.orderId,
      {
        pickupDate,
        pickupTime,
        pickupLocation,
        pickupInstructions: notes || "",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Pickup rescheduled successfully.",
      data: {
        shipmentId: shipping.shipmentId,
        pickupDate: shipping.pickupDate,
        pickupTime: shipping.pickupTime,
        pickupLocation: shipping.pickupLocation,
        pickupStatus: shipping.pickupStatus,
      },
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to reschedule pickup.",
    });
  }
};

module.exports = reschedulePickupExternal;