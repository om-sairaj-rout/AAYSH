const mongoose = require("mongoose");

const applyCompanyProductFilter = (req, filter = {}) => {
  if (req.user?.role === "admin") {
    const companyId = String(
      req.query.companyId || req.query.company_id || ""
    ).trim();
    if (companyId && companyId !== "ALL") {
      return { ...filter, companyID: companyId };
    }
    return filter;
  }

  if (req.user?.companyID) {
    return { ...filter, companyID: req.user.companyID };
  }

  if (req.user?.id) {
    return {
      ...filter,
      createdBy: new mongoose.Types.ObjectId(req.user.id),
    };
  }

  return filter;
};

const userOwnsProduct = (product, req) => {
  if (req.user?.role === "admin") return true;
  if (req.user?.companyID && product?.companyID) {
    return product.companyID === req.user.companyID;
  }
  return String(product?.createdBy) === String(req.user?.id);
};

module.exports = {
  applyCompanyProductFilter,
  userOwnsProduct,
};
