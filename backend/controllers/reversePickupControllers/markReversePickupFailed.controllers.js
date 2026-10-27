const ReversePickup = require("../../models/reversePickup.model");
const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");

const FAILURE_REASONS = [
  { code: "PICKUP_ATTEMPTS_EXHAUSTED", label: "Pickup attempts exhausted" },
  { code: "CUSTOMER_UNAVAILABLE", label: "Customer unavailable" },
  { code: "ADDRESS_ISSUE", label: "Address / location issue" },
  { code: "DAMAGED_PACKAGE", label: "Damaged package" },
  { code: "COURIER_ISSUE", label: "Courier operational issue" },
  { code: "OTHER", label: "Other (explain below)" },
];

const markReversePickupFailed = async (req, res) => {
  try {
    const { id } = req.params;
    const reasonCode = String(req.body.reasonCode || "").trim();
    const reasonText = String(req.body.reasonText || "").trim();

    const reasonDef = FAILURE_REASONS.find((row) => row.code === reasonCode);
    if (!reasonDef) {
      return res.status(400).json({
        success: false,
        message: "Invalid failure reason code.",
        reasons: FAILURE_REASONS,
      });
    }

    if (reasonCode === "OTHER" && !reasonText) {
      return res.status(400).json({
        success: false,
        message: "Explanation is required when reason is Other.",
      });
    }

    const request = await ReversePickup.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    if (["rejected", "delivered"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot mark as failed while status is ${request.status}.`,
      });
    }

    const finalReason =
      reasonCode === "OTHER" ? reasonText : reasonDef.label;

    const now = new Date();

    request.status = "failed";
    request.failureReason = finalReason;
    request.adminStatusLocked = true;
    request.reviewedBy = req.user.id;
    request.reviewedAt = now;
    request.syncedPickupStatus = "Failed";
    request.statusHistory.push({
      status: "failed",
      reasonCode,
      reasonText: finalReason,
      source: "admin",
      by: req.user.id,
      at: now,
    });

    await request.save();

    if (request.orderId) {
      const shipping = await Shipping.findOne({ orderId: request.orderId });
      if (shipping) {
        shipping.pickupStatus = "Failed";
        if (!["Delivered", "Cancelled"].includes(shipping.shippingStatus)) {
          shipping.pickupInstructions = [
            String(shipping.pickupInstructions || "").trim(),
            `Admin marked reverse pickup failed: ${finalReason}`,
          ]
            .filter(Boolean)
            .join(" | ");
        }
        await shipping.save();
      }

      await Order.updateOne(
        { _id: request.orderId, isReversePickup: true },
        {
          $set: {
            courierStatus: "Reverse Pickup Failed",
          },
        }
      );
    }

    const updated = await ReversePickup.findById(id)
      .populate("reviewedBy", "email fullName")
      .lean();

    return res.json({
      success: true,
      message: "Reverse pickup marked as failed.",
      request: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { markReversePickupFailed, FAILURE_REASONS };
