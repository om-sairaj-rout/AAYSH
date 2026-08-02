const Shipping = require("../../models/shipping.model");

const getAdminPickups = async (req, res) => {
  try {
    const pickups = await Shipping.find({
      awbNumber: { $ne: "" }
    })
      .populate({
        path: "orderId",
        select: "externalOrderId",
      })
      .populate({
        path: "courierId",
        select: "courierName contactPhone",
      })
      .populate({
        path: "orderId",
        populate: {
          path: "userId",
          select: "username email",
        },
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

      userId: pickup.orderId?.userId
        ? {
            _id: pickup.orderId.userId._id,
            username: pickup.orderId.userId.username,
            email: pickup.orderId.userId.email,
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