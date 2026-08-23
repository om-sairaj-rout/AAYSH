const Shipping = require("../../models/upload/shipping.model");

const reschedulePickup = async (req, res) => {
  try {
    const {
  pickupId,
  pickupDate,
  pickupLocation,
  pickupTime,
  notes,
} = req.body;

    if (!pickupId || !pickupDate) {
      return res.status(400).json({
        success: false,
        message: "Pickup ID and Pickup Date are required.",
      });
    }

    const pickup = await Shipping.findById(pickupId);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found.",
      });
    }

    if (pickupTime) {
  if (pickupTime < "11:00" || pickupTime > "17:00") {
    return res.status(400).json({
      success: false,
      message: "Pickup time must be between 11:00 AM and 5:00 PM.",
    });
  }
}

    const updatedPickup = await Shipping.findByIdAndUpdate(
  pickupId,
  {
    $set: {
      pickupDate,
      requestedPickupDate: pickupDate,
      pickupTime: pickupTime || pickup.pickupTime,
      pickupLocation: pickupLocation || pickup.pickupLocation,
      pickupInstructions: notes || "",
      pickupStatus: "Scheduled",
      failureReason: "",
      pickedUpAt: null,
      actualPickupDate: null,
    },
  },
  {
    new: true,
    runValidators: true,
  }
);

    return res.status(200).json({
      success: true,
      message: "Pickup rescheduled successfully.",
      data: updatedPickup,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to reschedule pickup.",
    });
  }
};

module.exports = reschedulePickup;