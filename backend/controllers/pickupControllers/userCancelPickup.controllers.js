const Pickup = require("../../models/pickup.model");

const UserPickupCancel = async (req, res) => {
  try {
    const { pickupId } = req.body;

    const pickup = await Pickup.findById(pickupId);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found",
      });
    }

    pickup.pickupStatus = "Cancelled";
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