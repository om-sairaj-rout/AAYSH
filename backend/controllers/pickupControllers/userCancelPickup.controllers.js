const Shipping = require("../../models/upload/shipping.model"); // adjust path

const UserPickupCancel = async (req, res) => {
  try {
    const { pickupId } = req.body;

    const pickup = await Shipping.findById(pickupId);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found",
      });
    }

    pickup.pickupStatus = "Cancelled";
    pickup.pickupCancelledAt = new Date();

    await pickup.save();

    return res.json({
      success: true,
      message: "Pickup cancelled successfully",
      data: pickup,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = UserPickupCancel;