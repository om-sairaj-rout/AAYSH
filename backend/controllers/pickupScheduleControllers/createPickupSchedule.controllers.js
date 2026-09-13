const PickupSchedule = require("../../models/pickupSchedule.model");
const { parseISODateOnly } = require("../../utils/dateTime");
const {
  VALID_SERVICE_TYPES,
  validatePickupTimeWindow,
  formatPickupSchedule,
} = require("../../utils/pickupScheduleHelpers");

const createPickupSchedule = async (req, res) => {
  try {
    const {
      pickupDate,
      pickupTime = "11:00",
      pickupLocation,
      pickupPincode = "",
      noOfBoxes = 1,
      weight = 0,
      preferredServiceType = "surface",
      notes = "",
    } = req.body;

    if (!pickupLocation || !String(pickupLocation).trim()) {
      return res.status(400).json({
        success: false,
        message: "Pickup location is required",
      });
    }

    const parsedDate = parseISODateOnly(pickupDate);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup date is required (YYYY-MM-DD)",
      });
    }

    const timeError = validatePickupTimeWindow(parsedDate, pickupTime);
    if (timeError) {
      return res.status(400).json({ success: false, message: timeError });
    }

    const service = String(preferredServiceType || "surface").toLowerCase();
    if (!VALID_SERVICE_TYPES.includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type",
      });
    }

    const companyID = String(req.user.companyID || "")
      .trim()
      .toUpperCase();

    if (!companyID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const schedule = await PickupSchedule.create({
      scheduleId: `SCH-${Date.now()}`,
      companyID,
      scheduledBy: req.user.id,
      status: "scheduled",
      pickupDate: parsedDate,
      pickupTime: String(pickupTime).trim() || "11:00",
      pickupLocation: String(pickupLocation).trim(),
      pickupPincode: String(pickupPincode).trim(),
      noOfBoxes: Math.max(1, Number(noOfBoxes) || 1),
      weight: Number(weight) || 0,
      preferredServiceType: service,
      notes: String(notes || "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Pickup scheduled successfully",
      schedule: formatPickupSchedule(schedule.toObject()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = createPickupSchedule;
