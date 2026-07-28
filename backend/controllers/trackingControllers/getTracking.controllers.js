const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");

const getTracking = async (req, res) => {
  try {
    const { awb } = req.params;

    const shipping = await Shipping.findOne({
      awbNumber: awb,
    });

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const tracking = await Tracking.find({
      shippingId: shipping._id,
    }).sort({
      eventTime: -1,
    });

    return res.json({
      success: true,
      tracking,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getTracking;