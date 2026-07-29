const XLSX = require("xlsx");

const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const downloadUserOrdersExcel = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all user's orders
    const orders = await Order.find({
      uploadedBy: userId,
    });

    const excelData = [];

    for (const order of orders) {

      const shipping = await Shipping.findOne({
        orderId: order._id,
      });

      // Skip if AWB not assigned
      if (!shipping || !shipping.awbNumber) {
        continue;
      }

      // Skip delivered shipments
      const finalStatuses = [
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
];

if (finalStatuses.includes(shipping.shippingStatus)) {
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

    const worksheet =
      XLSX.utils.json_to_sheet(excelData);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Tracking Update"
    );

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
      `attachment; filename=tracking-update-${userId}.xlsx`
    );

    return res.send(buffer);

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = downloadUserOrdersExcel;