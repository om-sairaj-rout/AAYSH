const Courier = require("../../models/awb/courier.model");

const listCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find({}, "name supportsPrime");

    if (!couriers.length) {
      return res.status(404).json({
        success: false,
        message: "No couriers found.",
      });
    }

    return res.status(200).json({
      success: true,
      total_couriers: couriers.length,
      couriers: couriers.map((courier) => ({
        courier_name: courier.name,
        active: true,
        supports_prime: courier.supportsPrime,
      })),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch couriers.",
    });
  }
};

module.exports = listCouriers;