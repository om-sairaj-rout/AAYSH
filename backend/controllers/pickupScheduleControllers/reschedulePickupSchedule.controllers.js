const PickupSchedule = require("../../models/pickupSchedule.model");
const { parseISODateOnly } = require("../../utils/dateTime");
const {
  validatePickupTimeWindow,
  formatPickupSchedule,
} = require("../../utils/pickupScheduleHelpers");

const assertCanAccessSchedule = (req, schedule) => {
  if (req.user.role === "admin" && !req.user.permissionsManaged) {
    return true;
  }
  if (schedule.companyID && schedule.companyID === req.user.companyID) {
    return true;
  }
  return String(schedule.scheduledBy) === String(req.user.id);
};

const reschedulePickupSchedule = async (req, res) => {
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
        message: "Only scheduled pickups can be rescheduled",
      });
    }

    const { pickupDate, pickupTime, pickupLocation, notes } = req.body;
    const parsedDate = parseISODateOnly(pickupDate || schedule.pickupDate);
    const nextTime = String(pickupTime || schedule.pickupTime || "11:00").trim();

    const timeError = validatePickupTimeWindow(parsedDate, nextTime);
    if (timeError) {
      return res.status(400).json({ success: false, message: timeError });
    }

    schedule.pickupDate = parsedDate;
    schedule.pickupTime = nextTime;
    if (pickupLocation !== undefined) {
      schedule.pickupLocation = String(pickupLocation).trim();
    }
    if (notes !== undefined) {
      schedule.notes = String(notes).trim();
    }
    await schedule.save();

    return res.json({
      success: true,
      message: "Pickup schedule updated",
      schedule: formatPickupSchedule(schedule.toObject()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = reschedulePickupSchedule;
