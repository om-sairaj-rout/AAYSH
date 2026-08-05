const Courier = require("../../models/awb/courier.model");
const CourierPriority = require("../../models/pincode/courierPriority.model");

const getCourierPriority = async (req, res) => {
  try {
    const { service } = req.params;

    if (!["surface", "air", "prime"].includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service",
      });
    }

    let priority = await CourierPriority.findOne({
      service,
    }).lean();

    // First time setup
    if (!priority) {
      const couriers = await Courier.find({})
        .sort({ name: 1 })
        .lean();

      priority = await CourierPriority.create({
        service,
        priority: couriers.map((courier, index) => ({
          courierId: courier._id,
          courierName: courier.name,
          order: index + 1,
        })),
      });

      priority = priority.toObject();
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