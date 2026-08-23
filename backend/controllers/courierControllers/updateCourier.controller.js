const Courier = require("../../models/awb/courier.model");
const PincodeServiceability = require("../../models/upload/serviceability.model");
const CourierPriority = require("../../models/upload/courierPriority.model");
const Shipping = require("../../models/upload/shipping.model");

const updateCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
    const name = String(req.body.name || "").trim();
    const supportsPrime = req.body.supportsPrime;

    const courier = await Courier.findById(courierId);
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    if (name && name !== courier.name) {
      const exists = await Courier.findOne({
        name,
        _id: { $ne: courier._id },
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Courier already exists",
        });
      }
      courier.name = name;
    }

    if (supportsPrime !== undefined) {
      courier.supportsPrime = Boolean(supportsPrime);
    }

    await courier.save();

    await PincodeServiceability.updateMany(
      { "couriers.courierId": courier._id },
      { $set: { "couriers.$[entry].courierName": courier.name } },
      { arrayFilters: [{ "entry.courierId": courier._id }] }
    );

    await CourierPriority.updateMany(
      { "priority.courierId": courier._id },
      { $set: { "priority.$[entry].courierName": courier.name } },
      { arrayFilters: [{ "entry.courierId": courier._id }] }
    );

    await Shipping.updateMany(
      { courierId: courier._id },
      { $set: { courierName: courier.name } }
    );

    return res.json({
      success: true,
      courier,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = updateCourier;
