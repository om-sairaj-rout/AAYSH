const Courier = require("../../models/awb/courier.model");
const CourierPriority = require("../../models/upload/courierPriority.model");

const updateCourierPriority = async (req, res) => {
  try {
    const { service } = req.params;
    const { priority } = req.body;

    if (!["surface", "air", "prime"].includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service",
      });
    }

    if (!Array.isArray(priority) || priority.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Priority list required",
      });
    }

    // Validate courier ids
    const courierIds = priority.map((p) => p.courierId);

    const couriers = await Courier.find({
      _id: { $in: courierIds },
    })
      .select("_id name")
      .lean();

    if (couriers.length !== priority.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier selected",
      });
    }

    const courierMap = new Map(
      couriers.map((c) => [c._id.toString(), c.name])
    );

    const updatedPriority = priority.map((item, index) => ({
      courierId: item.courierId,
      courierName: courierMap.get(item.courierId.toString()),
      order: index + 1,
    }));

    await CourierPriority.findOneAndUpdate(
      { service },
      {
        service,
        priority: updatedPriority,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.json({
      success: true,
      message: "Priority updated successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = updateCourierPriority;