const Courier = require("../../models/awb/courier.model");
const Awb =
  require("../../models/awb/awb.model");

const getCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find();

    const data = await Promise.all(
      couriers.map(async (courier) => {
        const under1kg = await Awb.countDocuments({
          courierId: courier._id,
          category: "under1kg",
          status: "available",
        });

        const over3kg = await Awb.countDocuments({
          courierId: courier._id,
          category: "over3kg",
          status: "available",
        });

        // Added Prime category logic here
        const prime = await Awb.countDocuments({
          courierId: courier._id,
          category: "prime",
          status: "available",
        });

        return {
          _id: courier._id,
          name: courier.name,
          unbookedUnder1kg: under1kg,
          unbookedOver3kg: over3kg,
          unbookedPrime: prime, // Returning Prime count to frontend
        };
      })
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getCouriers;