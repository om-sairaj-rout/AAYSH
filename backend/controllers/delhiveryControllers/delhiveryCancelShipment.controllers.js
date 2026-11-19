const mongoose = require("mongoose");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const Order = require("../../models/upload/order.model");
const { assertUserCanAccessDelhiveryShipment } = require("../../utils/delhiveryShipmentHelpers");
const {
  getDelhiveryCancelEligibility,
  submitDelhiveryShipmentCancel,
  listIncompleteDelhiveryCancelOperations,
} = require("../../services/delhivery/delhiveryCancelShipment.service");
const { isUnrestrictedAdmin } = require("../../utils/permissions");

const loadOrderForCancel = async (req, orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return { error: { status: 400, message: "Invalid orderId" } };
  }
  const filter = applyCompanyOrderFilter(req, { _id: orderId });
  const order = await Order.findOne(filter).lean();
  if (!order) {
    return { error: { status: 404, message: "Order not found" } };
  }
  const access = assertUserCanAccessDelhiveryShipment(order, req.user);
  if (!access.ok) {
    return { error: { status: 403, message: access.message } };
  }
  return { order };
};

const getDelhiveryShipmentCancelEligibility = async (req, res) => {
  try {
    const loaded = await loadOrderForCancel(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const result = await getDelhiveryCancelEligibility({
      orderId: loaded.order._id,
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Could not load cancellation eligibility",
    });
  }
};

const cancelDelhiveryShipmentController = async (req, res) => {
  try {
    const loaded = await loadOrderForCancel(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const {
      confirm = false,
      note = "",
      resume_operation_id: resumeOperationId = null,
    } = req.body || {};

    const result = await submitDelhiveryShipmentCancel({
      orderId: loaded.order._id,
      user: req.user,
      confirm,
      note,
      resumeOperationId,
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        uncertain: result.uncertain,
        ...result,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Delhivery shipment cancellation failed",
    });
  }
};

const listIncompleteDelhiveryCancellations = async (req, res) => {
  try {
    if (!isUnrestrictedAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const companyID = req.query.company_id || null;
    const data = await listIncompleteDelhiveryCancelOperations({ companyID });
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Could not list incomplete cancellations",
    });
  }
};

module.exports = {
  getDelhiveryShipmentCancelEligibility,
  cancelDelhiveryShipmentController,
  listIncompleteDelhiveryCancellations,
};