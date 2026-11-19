const mongoose = require("mongoose");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const Order = require("../../models/upload/order.model");
const { assertUserCanAccessDelhiveryShipment } = require("../../utils/delhiveryShipmentHelpers");
const {
  getDelhiveryEditEligibility,
  submitDelhiveryShipmentEdit,
  listIncompleteDelhiveryEditOperations,
} = require("../../services/delhivery/delhiveryEditShipment.service");
const { isUnrestrictedAdmin } = require("../../utils/permissions");

const loadOrderForEdit = async (req, orderId) => {
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

const getDelhiveryShipmentEditEligibility = async (req, res) => {
  try {
    const loaded = await loadOrderForEdit(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const result = await getDelhiveryEditEligibility({
      orderId: loaded.order._id,
      user: req.user,
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
      message: err.message || "Could not load edit eligibility",
    });
  }
};

const editDelhiveryShipmentController = async (req, res) => {
  try {
    const loaded = await loadOrderForEdit(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const {
      changes = {},
      payment_mode_change: paymentModeChange = false,
      confirm = false,
      note = "",
      resume_operation_id: resumeOperationId = null,
    } = req.body || {};

    const result = await submitDelhiveryShipmentEdit({
      orderId: loaded.order._id,
      user: req.user,
      changes,
      paymentModeChange: Boolean(paymentModeChange),
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
      message: err.message || "Delhivery shipment edit failed",
    });
  }
};

const listIncompleteDelhiveryEdits = async (req, res) => {
  try {
    const companyID = isUnrestrictedAdmin(req.user)
      ? req.query.company_id || null
      : req.user?.companyID || null;

  if (!companyID && !isUnrestrictedAdmin(req.user)) {
      return res.status(400).json({
        success: false,
        message: "Company context required.",
      });
    }

    const data = await listIncompleteDelhiveryEditOperations({ companyID });
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Could not list incomplete edits",
    });
  }
};

module.exports = {
  getDelhiveryShipmentEditEligibility,
  editDelhiveryShipmentController,
  listIncompleteDelhiveryEdits,
};
