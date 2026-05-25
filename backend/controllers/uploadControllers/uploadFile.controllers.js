const xlsx = require("xlsx");
const mongoose = require("mongoose");

const Order = require("../../models/upload/order.model");

const UploadHistory = require(
  "../../models/upload/uploadHistory.model"
);

const getCategory = require(
  "../../utils/categoryMapper"
);

const getExpectedHours = require(
  "../../utils/tatMapper"
);

const parseExcelDate = (value) => {

  if (!value) return null;

  if (typeof value === "string") {

    const parsedDate = new Date(value);

    if (!isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  if (typeof value === "number") {

    return new Date(
      (value - 25569) * 86400 * 1000
    );
  }

  return null;
};

const uploadFileController = async (
  req,
  res
) => {

  try {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = xlsx.read(
      req.file.buffer,
      {
        type: "buffer",
      }
    );

    const rawData =
      xlsx.utils.sheet_to_json(
        workbook.Sheets[
          workbook.SheetNames[0]
        ]
      );

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel sheet empty",
      });
    }

    const historyId =
      new mongoose.Types.ObjectId();

    const sanitizedOrders = rawData.map(
      (row) => {

        const baseOrder = {

          historyId,

          uploadedBy: req.user.id,

          pickupDate: parseExcelDate(
            row["Pickup Date"]
          ),

          consignorName:
            row["Consignor Name"] || "",

          consigneeName:
            row["Consignee Name"] || "",

          address:
            row["Address"] || "",

          contactNo:
            row["Contact No"] || "",

          destinationCity:
            row["Destination City"] || "",

          destinationState:
            row["Destination State"] || "",

          destinationPincode:
            row["Destination Pincode"] || "",

          qty:
            Number(row["Qty"]) || 1,

          invoiceNo:
            row["Invoice No/Challan No"] ||
            "",

          invoiceValue:
            Number(
              row["Invoice Value"]
            ) || 0,

          // Manual Later
          weight: 0,

          courierStatus: "Not Shipped",

          awbNumber: "",
        };

        const category = getCategory(
  baseOrder.destinationCity
);

const expectedHours =
  getExpectedHours(category);

return {
  ...baseOrder,
  category,
  expectedHours,
};

      }
    );

    await Order.insertMany(
      sanitizedOrders
    );

    await UploadHistory.create({

      _id: historyId,

      fileName: req.file.originalname,

      totalRows:
        sanitizedOrders.length,

      uploadedBy: req.user.id,

      isVisible: true,
    });

    return res.status(200).json({
      success: true,
      message: `${sanitizedOrders.length} orders uploaded successfully`,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = uploadFileController;