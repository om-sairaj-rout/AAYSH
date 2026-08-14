const mongoose = require("mongoose");

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
  applyCompanyOrderFilter,
  buildOrderScopeForUser,
  userOwnsOrder,
};
