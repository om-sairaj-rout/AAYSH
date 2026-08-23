const Awb = require("../../models/awb/awb.model");
const Shipping = require("../../models/upload/shipping.model");

const ALLOWED_CATEGORIES = ["under3kg", "over3kg", "prime", "codToPay"];
const ALLOWED_STATUSES = ["available", "booked"];

const updateAwb = async (req, res) => {
  try {
    const { awbId } = req.params;
    const awb = await Awb.findById(awbId);

    if (!awb) {
      return res.status(404).json({
        success: false,
        message: "AWB not found",
      });
    }

    const linkedShipment = await Shipping.findOne({
      awbNumber: awb.awbNumber,
    }).lean();

    if (req.body.awbNumber !== undefined) {
      const nextNumber = String(req.body.awbNumber).trim();
      if (!nextNumber) {
        return res.status(400).json({
          success: false,
          message: "AWB number is required",
        });
      }

      if (linkedShipment && nextNumber !== awb.awbNumber) {
        return res.status(409).json({
          success: false,
          message: "Cannot change an AWB number that is linked to a shipment.",
        });
      }

      const duplicate = await Awb.findOne({
        awbNumber: nextNumber,
        _id: { $ne: awb._id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "AWB number already exists",
        });
      }
      awb.awbNumber = nextNumber;
    }

    if (req.body.category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid AWB category",
        });
      }
      awb.category = req.body.category;
    }

    if (req.body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid AWB status",
        });
      }
      if (linkedShipment && req.body.status === "available") {
        return res.status(409).json({
          success: false,
          message: "Cannot mark an AWB available while a shipment still uses it.",
        });
      }
      awb.status = req.body.status;
      if (req.body.status === "available") {
        awb.assignedOrder = null;
      }
    }

    await awb.save();

    return res.json({
      success: true,
      awb,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = updateAwb;
