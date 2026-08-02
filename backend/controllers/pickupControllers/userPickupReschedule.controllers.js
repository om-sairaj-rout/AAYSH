const Shipping = require("../../models/upload/shipping.model");

const reschedulePickup = async (req, res) => {
  try {
    const {
      pickupId,
      pickupDate,
      pickupLocation,
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

    pickup.pickupDate = pickupDate;
    pickup.pickupLocation = pickupLocation || pickup.pickupLocation;

    // Save notes inside pickupInstructions
    pickup.pickupInstructions = notes || "";

    // Reset failure state
    pickup.pickupStatus = "Scheduled";

    await pickup.save();

    return res.status(200).json({
      success: true,
      message: "Pickup rescheduled successfully.",
      data: pickup,
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