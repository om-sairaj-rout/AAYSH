const PickupSchedule = require("../../models/pickupSchedule.model");
const { formatPickupSchedule } = require("../../utils/pickupScheduleHelpers");
const {
  completePickupScheduleFlow,
  parseDocumentTypes,
} = require("../../utils/completePickupSchedule");

const parseCompleteBody = (req) => {
  if (req.body?.data) {
    try {
      return typeof req.body.data === "string"
        ? JSON.parse(req.body.data)
        : req.body.data;
    } catch {
      throw new Error("Invalid order payload JSON");
    }
  }
  return req.body || {};
};

const assertCanCompleteSchedule = (req, schedule) => {
  if (req.user.role === "admin") {
    return true;
  }
  if (schedule.companyID && schedule.companyID === req.user.companyID) {
    return true;
  }
  return false;
};

const completePickupSchedule = async (req, res) => {
  try {
    const schedule = await PickupSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Pickup schedule not found",
      });
    }

    if (!assertCanCompleteSchedule(req, schedule)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to complete this pickup",
      });
    }

    const rawBody = parseCompleteBody(req);
    const documentTypes = parseDocumentTypes(
      rawBody.document_types || req.body.document_types
    );
    const files = Array.isArray(req.files) ? req.files : [];

    const result = await completePickupScheduleFlow({
      schedule,
      rawBody,
      user: req.user,
      files,
      documentTypes,
    });

    const orderCount = result.orderSummaries.length;
    const allAwbAssigned = result.orderSummaries.every((row) => row.awbAssigned);
    const anyAwbAssigned = result.orderSummaries.some((row) => row.awbAssigned);

    let message = `${orderCount} order(s) created successfully`;
    if (allAwbAssigned) {
      message = `${orderCount} order(s) created and AWB assigned successfully`;
    } else if (anyAwbAssigned) {
      message = `${orderCount} order(s) created. Some AWB assignments failed — ship from All Orders when ready.`;
    } else if (orderCount > 0) {
      message = `${orderCount} order(s) created. AWB assignment failed — ship from All Orders when ready.`;
    }

    return res.status(201).json({
      success: true,
      message,
      awbAssigned: result.awbAssigned,
      awbFailureReason: result.awbFailureReason,
      order_id: result.orderSummaries[0]?.externalOrderId || "",
      shipment_id: result.orderSummaries[0]?.shipmentId || "",
      orders: result.orderSummaries,
      schedule: formatPickupSchedule(result.schedule.toObject()),
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 409) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate Order ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to complete pickup schedule",
    });
  }
};

module.exports = completePickupSchedule;
