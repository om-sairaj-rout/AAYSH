const Shipping = require("../../models/upload/shipping.model");
const {
  parseISODateOnly,
  startOfTodayIST,
  compareISODates,
  toISTDate,
} = require("../../utils/dateTime");

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

    // ==========================
// Pickup Date Validation (IST)
// ==========================

const requestedDate = parseISODateOnly(pickupDate);
const todayIST = startOfTodayIST();

if (!requestedDate || !todayIST) {
  return res.status(400).json({
    success: false,
    message: "Invalid pickupDate. Expected format YYYY-MM-DD.",
  });
}

if (compareISODates(requestedDate, todayIST) < 0) {
  return res.status(400).json({
    success: false,
    message:
      "Pickup date cannot be earlier than today's date.",
  });
}

// ==========================
// Pickup Time Validation
// ==========================

if (pickupTime < "11:00" || pickupTime > "17:00") {
  return res.status(400).json({
    success: false,
    message:
      "Pickup time must be between 11:00 AM and 5:00 PM IST.",
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

    shipping.pickupDate = requestedDate;
    shipping.requestedPickupDate = requestedDate;
    shipping.pickupTime = pickupTime;
    shipping.pickupLocation = pickupLocation;
    shipping.pickupInstructions = notes || "";
    shipping.pickupStatus = "Scheduled";
    shipping.failureReason = "";
    shipping.pickedUpAt = null;
    shipping.actualPickupDate = null;

    await shipping.save();

    return res.status(200).json({
      success: true,
      message: "Pickup rescheduled successfully.",
      data: {
        shipmentId: shipping.shipmentId,
        pickupDate: toISTDate(shipping.pickupDate),
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