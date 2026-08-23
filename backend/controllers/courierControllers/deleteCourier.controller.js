const mongoose = require("mongoose");
const Courier = require("../../models/awb/courier.model");
const Awb = require("../../models/awb/awb.model");
const PincodeServiceability = require("../../models/upload/serviceability.model");
const CourierPriority = require("../../models/upload/courierPriority.model");
const Shipping = require("../../models/upload/shipping.model");

const deleteCourier = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courierId } = req.params;
    const courier = await Courier.findById(courierId).session(session);

    if (!courier) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    const bookedAwbs = await Awb.find({
      courierId: courier._id,
      status: "booked",
    })
      .select("awbNumber")
      .session(session)
      .lean();

    const bookedNumbers = bookedAwbs.map((item) => item.awbNumber).filter(Boolean);

    const shippingExists = await Shipping.exists({
      $or: [
        { courierId: courier._id },
        ...(bookedNumbers.length ? [{ awbNumber: { $in: bookedNumbers } }] : []),
      ],
    }).session(session);

    if (shippingExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this courier because it has AWBs or shipments in history.",
      });
    }

    await Awb.deleteMany({ courierId: courier._id }).session(session);
    await PincodeServiceability.updateMany(
      {},
      { $pull: { couriers: { courierId: courier._id } } }
    ).session(session);
    await CourierPriority.updateMany(
      {},
      { $pull: { priority: { courierId: courier._id } } }
    ).session(session);
    await Courier.deleteOne({ _id: courier._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Courier and related inventory deleted",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = deleteCourier;
