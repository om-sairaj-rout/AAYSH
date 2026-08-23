const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Company = require("../../models/company.model");
const { buildOrderScopeForCompany } = require("../../utils/companyScope");

const getOrdersByCompanyController = async (req, res) => {
  try {
    const { companyID } = req.params;

    if (!companyID || !String(companyID).trim()) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const normalizedCompanyID = String(companyID).trim().toUpperCase();
    const company = await Company.findOne({ companyID: normalizedCompanyID })
      .select("companyID companyName")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const orders = await Order.find(
      buildOrderScopeForCompany(normalizedCompanyID)
    ).lean();

    const orderIds = orders.map((order) => order._id);
    const shippings = await Shipping.find({
      orderId: { $in: orderIds },
    }).lean();

    const shippingMap = new Map();
    shippings.forEach((shipping) => {
      shippingMap.set(String(shipping.orderId), shipping);
    });

    const finalOrders = orders
      .map((order) => ({
        ...order,
        shipping: shippingMap.get(String(order._id)) || null,
      }))
      .sort((a, b) => {
        const dateA = a.shipping?.pickupDate
          ? new Date(a.shipping.pickupDate).getTime()
          : 0;
        const dateB = b.shipping?.pickupDate
          ? new Date(b.shipping.pickupDate).getTime()
          : 0;
        return dateB - dateA;
      });

    return res.status(200).json({
      success: true,
      company,
      orders: finalOrders,
      count: finalOrders.length,
    });
  } catch (error) {
    console.error("Get Orders By Company Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getOrdersByCompanyController;
