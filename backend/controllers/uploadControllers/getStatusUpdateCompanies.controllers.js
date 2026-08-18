const Company = require("../../models/company.model");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { FINAL_STATUS_UPDATE_EXCLUDED_STATUSES } = require("../../utils/companyScope");

const getStatusUpdateCompanies = async (req, res) => {
  try {
    const allCompanies = await Company.find()
      .select("companyID companyName")
      .sort({ companyName: 1 })
      .lean();

    const shippings = await Shipping.find({
      awbNumber: { $exists: true, $nin: ["", null] },
      shippingStatus: { $nin: FINAL_STATUS_UPDATE_EXCLUDED_STATUSES },
    })
      .select("orderId")
      .lean();

    const pendingCountByCompany = new Map();

    if (shippings.length) {
      const orderIds = shippings.map((row) => row.orderId);
      const orders = await Order.find({
        _id: { $in: orderIds },
        companyID: { $exists: true, $nin: ["", null] },
      })
        .select("companyID")
        .lean();

      for (const order of orders) {
        const companyID = String(order.companyID).trim().toUpperCase();
        pendingCountByCompany.set(
          companyID,
          (pendingCountByCompany.get(companyID) || 0) + 1
        );
      }
    }

    const payload = allCompanies.map((company) => ({
      companyID: company.companyID,
      companyName: company.companyName,
      pendingCount: pendingCountByCompany.get(company.companyID) || 0,
    }));

    return res.status(200).json({
      success: true,
      companies: payload,
    });
  } catch (error) {
    console.error("GET STATUS UPDATE COMPANIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch companies for status update",
    });
  }
};

module.exports = getStatusUpdateCompanies;
