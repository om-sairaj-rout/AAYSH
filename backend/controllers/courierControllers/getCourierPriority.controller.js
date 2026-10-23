const Courier = require("../../models/awb/courier.model");
const CourierPriority = require("../../models/upload/courierPriority.model");
const {
  mergePriorityWithAllCouriers,
} = require("../../utils/mergeCourierPriorityList");

const getCourierPriority = async (req, res) => {
  try {
    const { service } = req.params;

    if (!["surface", "air", "prime"].includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service",
      });
    }

    const couriers = await Courier.find({}).sort({ name: 1 }).lean();

    let priority = await CourierPriority.findOne({
      service,
    }).lean();

    const mergedList = mergePriorityWithAllCouriers(
      priority?.priority,
      couriers
    );

    // First time setup — persist initial order
    if (!priority) {
      priority = await CourierPriority.create({
        service,
        priority: mergedList,
      });

      priority = priority.toObject();
    } else {
      priority = {
        ...priority,
        priority: mergedList,
      };
    }

    return res.json({
      success: true,
      data: priority,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = getCourierPriority;