const Awb = require("../models/awb/awb.model");
const Shipping = require("../models/upload/shipping.model");
const { now } = require("./dateTime");

const assignManualAwbToReversePickupShipping = async ({
  shipping,
  order,
  awbNumber,
  courierName,
  serviceType,
  request,
}) => {
  const trimmedAwb = String(awbNumber || "").trim();
  const trimmedCourier = String(courierName || "").trim();
  const service = String(serviceType || "surface").toLowerCase();

  if (!trimmedAwb) {
    throw new Error("AWB number is required");
  }

  if (!trimmedCourier) {
    throw new Error("Courier name is required");
  }

  if (!["surface", "air", "prime"].includes(service)) {
    throw new Error("Invalid service type");
  }

  const duplicate = await Shipping.findOne({
    awbNumber: trimmedAwb,
    _id: { $ne: shipping._id },
  }).lean();

  if (duplicate) {
    throw new Error("AWB number is already assigned to another shipment");
  }

  shipping.awbNumber = trimmedAwb;
  shipping.courierName = trimmedCourier;
  shipping.serviceType = service;
  shipping.pickupDate = request.pickupDate;
  shipping.pickupTime = request.pickupTime || "11:00";
  shipping.pickupInstructions = request.notes || request.remarks || "";
  shipping.pickupStatus = "Scheduled";
  shipping.shippingStatus = "Booked";
  shipping.bookedAt = now();
  shipping.totalWeight = order.chargeableWeight || order.weight || shipping.totalWeight || 0;

  await shipping.save();

  await Awb.findOneAndUpdate(
    { awbNumber: trimmedAwb, status: "available" },
    {
      $set: {
        status: "booked",
        assignedOrder: order._id,
      },
    }
  );

  return {
    awbNumber: trimmedAwb,
    courier: trimmedCourier,
    serviceType: service,
  };
};

module.exports = {
  assignManualAwbToReversePickupShipping,
};
