const Shipping = require("../../models/upload/shipping.model");

const UserPickupCancelExternal = async (req, res) => {
  try {
    const { shipmentId } = req.body;

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        message: "shipmentId is required.",
      });
    }

    const pickup = await Shipping.findOne({ shipmentId });

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found.",
      });
    }

    pickup.pickupStatus = "Cancelled";
    pickup.pickupCancelledAt = new Date();

    await pickup.save();

    return res.status(200).json({
      success: true,
      message: "Pickup cancelled successfully.",
      data: {
        shipmentId: pickup.shipmentId,
        pickupStatus: pickup.pickupStatus,
        pickupCancelledAt: pickup.pickupCancelledAt,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel pickup.",
    });
  }
};

module.exports = UserPickupCancelExternal;