const Awb = require("../../models/awb/awb.model");
const Shipping = require("../../models/upload/shipping.model");

const deleteAwb = async (req, res) => {
  try {
    const { awbId } = req.params;
    const awb = await Awb.findById(awbId);

    if (!awb) {
      return res.status(404).json({
        success: false,
        message: "AWB not found",
      });
    }

    const shipping = await Shipping.findOne({ awbNumber: awb.awbNumber }).lean();
    if (shipping || awb.status === "booked" || awb.assignedOrder) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete an AWB that is booked or linked to a shipment/order.",
      });
    }

    await Awb.deleteOne({ _id: awb._id });

    return res.json({
      success: true,
      message: "AWB deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = deleteAwb;
