const Shipping = require("../../models/shipping.model");

const failPickup = async (req, res) => {
  try {
    const { pickupId, failureReason } = req.body;

    const pickup = await Shipping.findById(pickupId);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found",
      });
    }

    pickup.pickupStatus = "Failed";
    pickup.failureReason = failureReason;

    await pickup.save();

    return res.json({
      success: true,
      message: "Pickup marked as failed",
      data: pickup,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = failPickup;