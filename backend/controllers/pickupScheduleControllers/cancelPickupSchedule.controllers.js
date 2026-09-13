const PickupSchedule = require("../../models/pickupSchedule.model");
const { formatPickupSchedule } = require("../../utils/pickupScheduleHelpers");

const assertCanAccessSchedule = (req, schedule) => {
  if (req.user.role === "admin" && !req.user.permissionsManaged) {
    return true;
  }
  if (schedule.companyID && schedule.companyID === req.user.companyID) {
    return true;
  }
  return String(schedule.scheduledBy) === String(req.user.id);
};

const cancelPickupSchedule = async (req, res) => {
  try {
    const schedule = await PickupSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Pickup schedule not found",
      });
    }

    if (!assertCanAccessSchedule(req, schedule)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    if (schedule.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled pickups can be cancelled",
      });
    }

    schedule.status = "cancelled";
    schedule.cancelledAt = new Date();
    await schedule.save();

    return res.json({
      success: true,
      message: "Pickup schedule cancelled",
      schedule: formatPickupSchedule(schedule.toObject()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = cancelPickupSchedule;
