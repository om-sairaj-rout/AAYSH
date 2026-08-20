const ReversePickup = require("../../models/reversePickup.model");
const {
  createOrderFromReversePickup,
  buildPickupLocation,
} = require("../../utils/reversePickupOrder");
const {
  assignManualAwbToReversePickupShipping,
} = require("../../utils/reversePickupManualAwb");

const approveReversePickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceType, adminNotes, awbNumber, courierName } = req.body;

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

    const trimmedAwb = String(awbNumber || "").trim();
    const trimmedCourier = String(courierName || "").trim();

    if (!trimmedAwb) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required",
      });
    }

    if (!trimmedCourier) {
      return res.status(400).json({
        success: false,
        message: "Courier name is required",
      });
    }

    request.assignedServiceType = assignedService;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.adminNotes = String(adminNotes || "").trim();
    request.failureReason = "";

    const { order, shipping } = await createOrderFromReversePickup(
      request,
      req.user
    );

    request.orderId = order._id;
    request.externalOrderId = order.externalOrderId;

    let awbAssignment;
    try {
      awbAssignment = await assignManualAwbToReversePickupShipping({
        shipping,
        order,
        awbNumber: trimmedAwb,
        courierName: trimmedCourier,
        serviceType: assignedService,
        request,
      });
    } catch (assignError) {
      request.status = "failed";
      request.failureReason = assignError.message;
      await request.save();

      return res.status(400).json({
        success: false,
        message: assignError.message,
        request,
      });
    }

    request.status = "awb_assigned";
    request.awbNumber = awbAssignment.awbNumber;
    request.courierName = awbAssignment.courier;
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Reverse pickup approved with manual AWB assignment",
      request,
      order: {
        orderId: order.externalOrderId,
        awbNumber: awbAssignment.awbNumber,
        courier: awbAssignment.courier,
        serviceType: awbAssignment.serviceType,
        pickupLocation: buildPickupLocation(request),
      },
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
