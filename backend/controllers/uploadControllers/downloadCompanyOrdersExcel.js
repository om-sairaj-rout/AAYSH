const XLSX = require("xlsx");

const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Company = require("../../models/company.model");
const {
  buildOrderScopeForCompany,
  FINAL_STATUS_UPDATE_EXCLUDED_STATUSES,
} = require("../../utils/companyScope");

const downloadCompanyOrdersExcel = async (req, res) => {
  try {
    const { companyID } = req.params;

    const company = await Company.findOne({
      companyID: String(companyID).trim().toUpperCase(),
    })
      .select("companyID companyName")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const orders = await Order.find(buildOrderScopeForCompany(company.companyID));

    const excelData = [];

    for (const order of orders) {
      const shipping = await Shipping.findOne({
        orderId: order._id,
      });

      if (!shipping || !shipping.awbNumber) {
        continue;
      }

      if (FINAL_STATUS_UPDATE_EXCLUDED_STATUSES.includes(shipping.shippingStatus)) {
        continue;
      }

      excelData.push({
        "AWB Number": shipping.awbNumber,
        "Current Status": shipping.shippingStatus,
        "New Status": "",
        "Location": "",
        "Failure Reason": "",
        "Remarks": "",
        "Tracking Date & Time": "",
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tracking Update");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=tracking-update-${company.companyID}.xlsx`
    );

    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = downloadCompanyOrdersExcel;
