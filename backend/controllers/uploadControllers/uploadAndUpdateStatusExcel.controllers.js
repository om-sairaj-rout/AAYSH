const XLSX = require("xlsx");
const Order = require("../../models/upload/order.model");

const uploadAndUpdateStatusExcel = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const validStatuses = new Set([
      "Not Shipped",
      "Booked",
      "In Transit",
      "Delivered",
      "Cancelled",
      "Delayed",
    ]);

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // utils.sheet_to_json reads raw data. Let's process rows carefully.
    const rows = XLSX.utils.sheet_to_json(sheet);

    let updated = 0;
    let notFound = 0;
    let invalidRows = [];

    for (let row of rows) {
      const awb = row["AWB Number"] || row["AWB"] || row["awbNumber"];
      const status = row["Status"];
      const deliveryDate = row["Delivery Date"];

      let parsedDeliveryDate = null;

      if (deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== "") {
        let cleaned = deliveryDate.toString().trim();

        // SCENARIO A: If Excel passes date as a raw Serial Number (e.g., 46165 for 25-05-2026)
        if (!isNaN(cleaned) && parseFloat(cleaned) > 40000) {
          // Convert Excel serial number directly to JavaScript Date object
          parsedDeliveryDate = XLSX.SSF.parse_date_code(parseFloat(cleaned));
          parsedDeliveryDate = new Date(
            Date.UTC(parsedDeliveryDate.y, parsedDeliveryDate.m - 1, parsedDeliveryDate.d)
          );
        } else {
          // SCENARIO B: String format parsing supporting DD-MM-YYYY or DD/MM/YYYY
          // Fixed escape parameters for reliable evaluation
          const match = cleaned.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);

          if (match) {
            const [, day, month, year] = match;
            // FORCE SAFE ISO FORMAT (YYYY-MM-DD)
            parsedDeliveryDate = new Date(
              `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`
            );
          } else {
            // Fallback for native formats like YYYY-MM-DD
            parsedDeliveryDate = new Date(cleaned);
          }
        }

        // Final sanity verification check
        if (!parsedDeliveryDate || isNaN(parsedDeliveryDate.getTime())) {
          parsedDeliveryDate = null;
        }
      }

      if (!awb) {
        invalidRows.push({ awb: "MISSING", status, reason: "AWB missing" });
        continue;
      }

      if (!validStatuses.has(status)) {
        invalidRows.push({ awb, status, reason: "Invalid status" });
        continue;
      }

      // Update Database
      const order = await Order.findOneAndUpdate(
        {
          uploadedBy: userId,
          awbNumber: awb.toString().trim(),
        },
        {
          $set: {
            courierStatus: status,
            // If delivered, apply parsed excel date. Fallback to current date if parsing failed.
            ...(status === "Delivered" && {
              deliveryDate: parsedDeliveryDate || new Date(),
            }),
          },
        },
        { new: true }
      );

      if (!order) {
        notFound++;
        invalidRows.push({ awb, status, reason: "Order not found" });
        continue;
      }

      updated++;
    }

    return res.json({
      success: true,
      updated,
      notFound,
      invalidRows: invalidRows.length,
      message: "Orders updated successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = uploadAndUpdateStatusExcel;