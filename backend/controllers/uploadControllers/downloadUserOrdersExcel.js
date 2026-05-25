const XLSX = require("xlsx");
const Order = require("../../models/upload/order.model");

const downloadUserOrdersExcel = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({
      uploadedBy: userId,
      awbNumber: { $exists: true, $ne: null, $ne: "" },
      courierStatus: { $ne: "Delivered" },
    });

    const excelData = orders.map((order) => {
      let formattedDate = "Pending";
      
      if (order.deliveryDate) {
        const d = new Date(order.deliveryDate);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          formattedDate = `${day}-${month}-${year}`; // Outputs clean DD-MM-YYYY
        }
      }

      return {
        "AWB Number": order.awbNumber,
        Status: order.courierStatus,
        "Delivery Date": formattedDate,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

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
      `attachment; filename=orders-${userId}.xlsx`
    );

    return res.send(buffer);

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = downloadUserOrdersExcel;