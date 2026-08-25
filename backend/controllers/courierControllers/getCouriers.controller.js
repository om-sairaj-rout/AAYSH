const Courier = require("../../models/awb/courier.model");
const Awb =
  require("../../models/awb/awb.model");

const getCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find();

    const data = await Promise.all(
      couriers.map(async (courier) => {
        const under3kg = await Awb.countDocuments({
          courierId: courier._id,
          category: "under3kg",
          status: "available",
        });

        const over3kg = await Awb.countDocuments({
          courierId: courier._id,
          category: "over3kg",
          status: "available",
        });

        const prime = await Awb.countDocuments({
          courierId: courier._id,
          category: "prime",
          status: "available",
        });

        const codToPay = await Awb.countDocuments({
          courierId: courier._id,
          category: "codToPay",
          status: "available",
        });

        return {
  _id: courier._id,
  name: courier.name,

  // AWB Counts
  unbookedUnder1kg: under3kg,
  unbookedOver3kg: over3kg,
  unbookedPrime: prime,
  unbookedCod: codToPay,
  unbookedCodToPay: codToPay,

  // Serviceability Counts
  totalPincodes: courier.totalPincodes || 0,
  surfacePincodesCount:
    courier.surfacePincodesCount || 0,
  airPincodesCount:
    courier.airPincodesCount || 0,
  primePincodesCount:
    courier.primePincodesCount || 0,
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