const Shipping = require("../../models/upload/shipping.model");

const getUserPickups = async (req, res) => {
  try {
    const pickups = await Shipping.find({
      awbNumber: { $ne: "" },
    })
      .populate({
        path: "orderId",
        select:
          "externalOrderId pickupLocation orderItems",
      })
      .sort({
        pickupDate: 1,
        createdAt: -1,
      });

    const data = pickups.map((item) => ({
      _id: item._id,

      orderId: item.orderId?._id,

      externalOrderId: item.orderId?.externalOrderId || "",

      awbNumber: item.awbNumber,

      courierName: item.courierName,

      pickupLocation:
        item.pickupLocation ||
        item.orderId?.pickupLocation ||
        "",

      pickupDate: item.pickupDate,

      pickupTime: item.pickupTime,

      packagesCount:
  item.orderId?.orderItems?.reduce(
    (total, product) => total + product.units,
    0
  ) || 0,

      contactPhone: "8882719505",

      pickupStatus: item.pickupStatus,

      failureReason:
  item.pickupStatus === "Failed"
    ? item.failureReason
    : "",

    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pickups",
    });
  }
};

module.exports = getUserPickups;