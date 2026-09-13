const {
  startOfDayIST,
  endOfDayIST,
  toISTDate,
} = require("./dateTime");

const VALID_SERVICE_TYPES = ["surface", "air", "prime"];

const validatePickupTimeWindow = (pickupDate, pickupTime) => {
  const todayStart = startOfDayIST(new Date());
  const todayEnd = endOfDayIST(new Date());
  const selectedDate = startOfDayIST(pickupDate);

  const [hours, minutes] = String(pickupTime || "11:00")
    .split(":")
    .map(Number);
  const selectedMinutes = hours * 60 + minutes;
  const startLimit = 11 * 60;
  const endLimit = 17 * 60;

  if (selectedMinutes < startLimit || selectedMinutes > endLimit) {
    return "Pickup time must be between 11:00 AM and 5:00 PM";
  }

  const isToday =
    selectedDate.getTime() >= todayStart.getTime() &&
    selectedDate.getTime() <= todayEnd.getTime();

  if (isToday) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentMinutes >= endLimit) {
      return "Pickups for today are closed after 5:00 PM. Choose a future date.";
    }
    if (selectedMinutes <= currentMinutes) {
      return "Pickup time must be later than the current time";
    }
  }

  return null;
};

const buildScheduleTabMatch = (tab) => {
  const todayStart = startOfDayIST(new Date());
  const todayEnd = endOfDayIST(new Date());

  switch (tab) {
    case "today":
      return {
        status: "scheduled",
        pickupDate: { $gte: todayStart, $lte: todayEnd },
      };
    case "future":
      return {
        status: "scheduled",
        pickupDate: { $gt: todayEnd },
      };
    case "scheduled":
      return { status: "scheduled" };
    case "completed":
      return { status: "completed" };
    case "cancelled":
      return { status: "cancelled" };
    case "all":
    default:
      return {};
  }
};

const formatCompanyAddress = (source = {}) => {
  if (!source || typeof source !== "object") return "";

  const line1 = String(source.address || "").trim();
  const cityState = [source.city, source.state]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  const pincode = String(source.zip_code || source.zipCode || "").trim();

  return [line1, cityState, pincode].filter(Boolean).join(", ");
};

const formatPickupSchedule = (schedule) => ({
  _id: String(schedule._id),
  scheduleId: schedule.scheduleId,
  companyID: schedule.companyID,
  status: schedule.status,
  pickupDate: toISTDate(schedule.pickupDate),
  pickupTime: schedule.pickupTime,
  pickupLocation: schedule.pickupLocation,
  pickupPincode: schedule.pickupPincode || "",
  noOfBoxes: schedule.noOfBoxes || 1,
  weight: schedule.weight || 0,
  preferredServiceType: schedule.preferredServiceType || "surface",
  notes: schedule.notes || "",
  orderId: schedule.orderId ? String(schedule.orderId) : null,
  orderIds: Array.isArray(schedule.orderIds)
    ? schedule.orderIds.map((id) => String(id))
    : schedule.orderId
    ? [String(schedule.orderId)]
    : [],
  expectedOrderCount: schedule.expectedOrderCount || 1,
  completedOrders: Array.isArray(schedule.completedOrders)
    ? schedule.completedOrders.map((row) => ({
        orderId: row.orderId ? String(row.orderId) : null,
        externalOrderId: row.externalOrderId || "",
        shipmentId: row.shipmentId || "",
        awbNumber: row.awbNumber || "",
        courierName: row.courierName || "",
        awbAssigned: Boolean(row.awbAssigned),
        awbFailureReason: row.awbFailureReason || "",
        noOfBoxes: row.noOfBoxes || 1,
      }))
    : [],
  externalOrderId: schedule.externalOrderId || "",
  awbAssigned: Boolean(schedule.awbAssigned),
  awbNumber: schedule.awbNumber || "",
  courierName: schedule.courierName || "",
  awbFailureReason: schedule.awbFailureReason || "",
  isPickupSchedule: true,
  createdAt: schedule.createdAt,
});

module.exports = {
  VALID_SERVICE_TYPES,
  validatePickupTimeWindow,
  buildScheduleTabMatch,
  formatPickupSchedule,
  formatCompanyAddress,
};
