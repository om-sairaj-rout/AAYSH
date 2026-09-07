const Awb = require("../../models/awb/awb.model");
const Shipping = require("../../models/upload/shipping.model");

const bulkDeleteAwbs = async (req, res) => {
  try {
    const awbIds = Array.isArray(req.body?.awbIds)
      ? [...new Set(req.body.awbIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    if (!awbIds.length) {
      return res.status(400).json({
        success: false,
        message: "No AWB IDs provided",
      });
    }

    const awbs = await Awb.find({ _id: { $in: awbIds } });
    const deleted = [];
    const failed = [];

    for (const awb of awbs) {
      const shipping = await Shipping.findOne({ awbNumber: awb.awbNumber }).lean();
      if (shipping || awb.status === "booked" || awb.assignedOrder) {
        failed.push({
          id: awb._id,
          awbNumber: awb.awbNumber,
          reason: "Booked or linked to a shipment/order",
        });
        continue;
      }

      await Awb.deleteOne({ _id: awb._id });
      deleted.push(awb._id);
    }

    const notFoundCount = awbIds.length - awbs.length;
    if (notFoundCount > 0) {
      failed.push({
        id: null,
        awbNumber: "",
        reason: `${notFoundCount} AWB record(s) not found`,
      });
    }

    return res.json({
      success: true,
      message: `Deleted ${deleted.length} AWB record(s)`,
      deletedCount: deleted.length,
      failedCount: failed.length,
      deleted,
      failed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = bulkDeleteAwbs;
