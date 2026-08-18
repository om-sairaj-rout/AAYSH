const ReversePickup = require("../../models/reversePickup.model");
const { assignAwbCore } = require("../../utils/assignAwbCore");
const {
  createOrderFromReversePickup,
  buildPickupLocation,
} = require("../../utils/reversePickupOrder");
const { toISTDate } = require("../../utils/dateTime");

const approveReversePickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceType, adminNotes } = req.body;

    const request = await ReversePickup.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Reverse pickup request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    const assignedService =
      serviceType || request.preferredServiceType || "surface";

    if (!["surface", "air", "prime"].includes(assignedService)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type",
      });
    }

    request.assignedServiceType = assignedService;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.adminNotes = String(adminNotes || "").trim();
    request.failureReason = "";

    const { order, pickupLocation } = await createOrderFromReversePickup(
      request,
      req.user
    );

    request.orderId = order._id;
    request.externalOrderId = order.externalOrderId;

    const awbResult = await assignAwbCore({
      serviceType: assignedService,
      orders: [{ orderId: order._id, weight: order.weight }],
      pickupDate: toISTDate(request.pickupDate),
      pickupLocation,
      pickupTime: request.pickupTime || "11:00",
      notes: request.notes || "",
    });

    const assigned = awbResult.data?.find((row) => row.awbNumber);
    const awbError =
      awbResult.data?.[0]?.error ||
      awbResult.message ||
      "AWB assignment failed";

    if (!assigned) {
      request.status = "failed";
      request.failureReason = awbError;
      await request.save();

      return res.status(400).json({
        success: false,
        message: awbError,
        request,
        awbResult,
      });
    }

    request.status = "awb_assigned";
    request.awbNumber = assigned.awbNumber;
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Reverse pickup approved and AWB assigned",
      request,
      order: {
        orderId: order.externalOrderId,
        awbNumber: assigned.awbNumber,
        courier: assigned.courier,
        serviceType: assigned.serviceType,
        pickupLocation: buildPickupLocation(request),
      },
      awbResult,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = approveReversePickup;
