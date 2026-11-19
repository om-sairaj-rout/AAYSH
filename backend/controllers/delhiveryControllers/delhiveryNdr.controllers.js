const mongoose = require("mongoose");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const Order = require("../../models/upload/order.model");
const { assertUserCanAccessDelhiveryShipment } = require("../../utils/delhiveryShipmentHelpers");
const { isUnrestrictedAdmin } = require("../../utils/permissions");
const {
  getDelhiveryNdrEligibility,
  submitDelhiveryNdrActionForOrder,
  refreshDelhiveryUplStatus,
  listDelhiveryNdrActionsForOrder,
} = require("../../services/delhivery/delhiveryNdr.service");

const assertAdminNdrAccess = (req, res) => {
  if (!isUnrestrictedAdmin(req.user)) {
    res.status(403).json({
      success: false,
      message: "Only unrestricted administrators can use Delhivery NDR actions.",
    });
    return false;
  }
  return true;
};

const loadOrderForNdr = async (req, orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return { error: { status: 400, message: "Invalid orderId" } };
  }
  const filter = applyCompanyOrderFilter(req, { _id: orderId });
  const order = await Order.findOne(filter).lean();
  if (!order) return { error: { status: 404, message: "Order not found" } };
  const access = assertUserCanAccessDelhiveryShipment(order, req.user);
  if (!access.ok) return { error: { status: 403, message: access.message } };
  return { order };
};

const getDelhiveryNdrEligibilityController = async (req, res) => {
  try {
    if (!assertAdminNdrAccess(req, res)) return;
    const loaded = await loadOrderForNdr(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const result = await getDelhiveryNdrEligibility({
      orderId: loaded.order._id,
      waybill: req.query.waybill,
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        uncertain: result.uncertain,
      });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Could not evaluate NDR eligibility",
    });
  }
};

const submitDelhiveryNdrController = async (req, res) => {
  try {
    if (!assertAdminNdrAccess(req, res)) return;
    const loaded = await loadOrderForNdr(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const { waybill, action, acknowledge_before_nine_pm: acknowledgeBeforeNinePm } =
      req.body || {};

    const result = await submitDelhiveryNdrActionForOrder({
      orderId: loaded.order._id,
      waybill,
      action,
      user: req.user,
      acknowledgeBeforeNinePm: Boolean(acknowledgeBeforeNinePm),
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        uncertain: result.uncertain,
        ...result,
      });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "NDR submission failed",
    });
  }
};

const getDelhiveryUplStatusController = async (req, res) => {
  try {
    if (!assertAdminNdrAccess(req, res)) return;

    const companyID = isUnrestrictedAdmin(req.user)
      ? null
      : String(req.user?.companyID || "").trim().toUpperCase();

    const result = await refreshDelhiveryUplStatus({
      uplId: req.params.uplId,
      user: req.user,
      companyID,
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "UPL status fetch failed",
    });
  }
};

const listDelhiveryNdrHistoryController = async (req, res) => {
  try {
    if (!assertAdminNdrAccess(req, res)) return;
    const loaded = await loadOrderForNdr(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const rows = await listDelhiveryNdrActionsForOrder(loaded.order._id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDelhiveryNdrEligibilityController,
  submitDelhiveryNdrController,
  getDelhiveryUplStatusController,
  listDelhiveryNdrHistoryController,
};