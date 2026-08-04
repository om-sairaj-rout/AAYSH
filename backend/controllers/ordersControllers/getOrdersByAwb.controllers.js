const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");

const getOrderByAwb = async (req, res) => {
  try {
    const { awbNumber } = req.params;
    console.log("AWB:", awbNumber);

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required",
      });
    }

    // =========================
    // FIND SHIPPING
    // =========================
    const shipping = await Shipping.findOne({
      awbNumber: awbNumber.trim(),
    }).lean();

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "No shipment found for this AWB",
      });
    }

    // =========================
    // FIND ORDER
    // =========================
    const order = await Order.findById(
      shipping.orderId
    ).lean();

    // =========================
    // FIND TRACKING HISTORY
    // =========================
    const tracking = await Tracking.find({
      shippingId: shipping._id,
    })
      .sort({ updatedAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      order,
      shipping,
      tracking,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching tracking details",
    });

  }
};

module.exports = getOrderByAwb;