const Courier = require("../../models/awb/courier.model");
const Awb = require("../../models/awb/awb.model");
const {
  AWB_CATEGORY_ABOVE1KG,
  AWB_CATEGORY_COD,
  AWB_CATEGORY_PRIME,
  AWB_CATEGORY_UNDER1KG_NORTH_NCR,
  AWB_CATEGORY_UNDER1KG_OTHER,
} = require("../../constants/awbCategories");

const countAvailable = (courierId, category) =>
  Awb.countDocuments({
    courierId,
    category,
    status: "available",
  });

const getCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find();

    const data = await Promise.all(
      couriers.map(async (courier) => {
        const under1kgNorthNcr = await countAvailable(
          courier._id,
          AWB_CATEGORY_UNDER1KG_NORTH_NCR
        );
        const under1kgOtherZones = await countAvailable(
          courier._id,
          AWB_CATEGORY_UNDER1KG_OTHER
        );
        const above1kg = await countAvailable(
          courier._id,
          AWB_CATEGORY_ABOVE1KG
        );
        const prime = await countAvailable(courier._id, AWB_CATEGORY_PRIME);
        const codToPay = await countAvailable(courier._id, AWB_CATEGORY_COD);

        return {
          _id: courier._id,
          name: courier.name,

          unbookedUnder1kgNorthNcr: under1kgNorthNcr,
          unbookedUnder1kgOtherZones: under1kgOtherZones,
          unbookedAbove1kg: above1kg,
          unbookedPrime: prime,
          unbookedCod: codToPay,
          unbookedCodToPay: codToPay,

          totalPincodes: courier.totalPincodes || 0,
          surfacePincodesCount: courier.surfacePincodesCount || 0,
          airPincodesCount: courier.airPincodesCount || 0,
          primePincodesCount: courier.primePincodesCount || 0,
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
