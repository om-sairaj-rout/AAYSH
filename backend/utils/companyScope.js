const mongoose = require("mongoose");

const FINAL_STATUS_UPDATE_EXCLUDED_STATUSES = [
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
  "Booked",
  "Pending",
];

const buildOrderScopeForUser = (user) => {
  if (user?.companyID) {
    return { companyID: user.companyID };
  }

  const userId = user?._id || user?.id;
  if (userId) {
    return { uploadedBy: new mongoose.Types.ObjectId(userId) };
  }

  return {};
};

const buildOrderScopeForCompany = (companyID) => {
  if (!companyID) return {};
  return { companyID: String(companyID).trim().toUpperCase() };
};

const applyCompanyOrderFilter = (req, filter = {}) => {
  if (req.user?.role === "admin") {
    return filter;
  }

  if (req.user?.companyID) {
    return {
      ...filter,
      companyID: req.user.companyID,
    };
  }

  if (req.user?.id) {
    return {
      ...filter,
      uploadedBy: new mongoose.Types.ObjectId(req.user.id),
    };
  }

  return filter;
};

const normalizeRateCompanyID = (companyID) =>
  String(companyID || "").trim().toUpperCase();

/**
 * Rate APIs: admins may target a requested company; others are locked to their own company.
 */
const resolveRateCompanyID = (req, requestedCompanyID) => {
  const requested = normalizeRateCompanyID(requestedCompanyID);
  const userCompany = normalizeRateCompanyID(req.user?.companyID);
  const isAdmin = req.user?.role === "admin";

  if (isAdmin) {
    const effective = requested || userCompany;
    if (!effective) {
      return {
        ok: false,
        status: 400,
        message: "companyID is required.",
      };
    }
    return { ok: true, companyID: effective };
  }

  if (!userCompany) {
    return {
      ok: false,
      status: 403,
      message: "Your account is not linked to a company. Cannot calculate rates.",
    };
  }

  if (requested && requested !== userCompany) {
    return {
      ok: false,
      status: 403,
      message: "You cannot access rates for another company.",
    };
  }

  return { ok: true, companyID: userCompany };
};

const userOwnsOrder = (order, req) => {
  if (req.user?.role === "admin") {
    return true;
  }

  if (req.user?.companyID && order?.companyID) {
    return order.companyID === req.user.companyID;
  }

  return String(order?.uploadedBy) === String(req.user?.id);
};

module.exports = {
  FINAL_STATUS_UPDATE_EXCLUDED_STATUSES,
  applyCompanyOrderFilter,
  buildOrderScopeForUser,
  buildOrderScopeForCompany,
  resolveRateCompanyID,
  userOwnsOrder,
};
