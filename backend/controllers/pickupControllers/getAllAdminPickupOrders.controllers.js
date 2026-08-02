const Shipping = require("../../models/upload/shipping.model");

const getAdminPickups = async (req, res) => {
  try {
    const pickups = await Shipping.find({
  awbNumber: { $ne: "" }
})
.populate({
  path: "orderId",
  select: "externalOrderId uploadedBy",
  populate: {
    path: "uploadedBy",
    select: "username email",
  },
})
.populate({
  path: "courierId",
  select: "courierName contactPhone",
})
.sort({ pickupDate: 1 });

    const formatted = pickups.map((pickup) => ({
      _id: pickup._id,
      orderId: pickup.orderId?._id,
      externalOrderId: pickup.orderId?.externalOrderId,
      awbNumber: pickup.awbNumber,
      courierName:
        pickup.courierName ||
        pickup.courierId?.courierName ||
        "",
      contactPhone:
        pickup.courierId?.contactPhone || "",
      pickupDate: pickup.pickupDate,
      pickupTime: pickup.pickupTime,
      pickupLocation: pickup.pickupLocation,
      pickupStatus: pickup.pickupStatus,
      failureReason: pickup.failureReason,
      packagesCount: 1,

      userId: pickup.orderId?.uploadedBy
  ? {
      _id: pickup.orderId.uploadedBy._id,
      username: pickup.orderId.uploadedBy.username,
      email: pickup.orderId.uploadedBy.email,
    }
  : null,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getAdminPickups;