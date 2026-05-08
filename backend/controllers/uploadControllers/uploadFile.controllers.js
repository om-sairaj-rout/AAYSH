const xlsx = require("xlsx");
const mongoose = require("mongoose");

const Order = require("../../models/upload/order.model");
const UploadHistory = require("../../models/upload/uploadHistory.model");


// Convert Excel Date Properly
const parseExcelDate = (value) => {

    if (!value) return null;

    // If already valid string date
    if (typeof value === "string") {

        const parsedDate = new Date(value);

        if (!isNaN(parsedDate)) {
            return parsedDate;
        }
    }

    // Excel serial number
    if (typeof value === "number") {

        return new Date(
            (value - 25569) * 86400 * 1000
        );
    }

    return null;
};

const uploadFileController = async (req, res) => {

    try {

        // Authentication Check
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // File Check
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        // Read Excel Workbook
        const workbook = xlsx.read(req.file.buffer, {
            type: "buffer",
            cellDates: true
        });

        // Convert Sheet to JSON
        const rawData = xlsx.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]],
            {
                raw: false,
                dateNF: "yyyy-mm-dd"
            }
        );

        // Empty File Check
        if (rawData.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Excel sheet is empty"
            });
        }

        // Generate Upload History ID
        const historyId = new mongoose.Types.ObjectId();

        // Sanitize Orders
        const sanitizedOrders = rawData
            .map((row) => ({

                // Upload Info
                historyId,
                uploadedBy: req.user.id,

                // Basic Order Details
                orderNumber:
                    row["Order No"]?.toString().trim() || "",

                awbNumber:
                    row["AWB No"]?.toString().trim() || "",

                // Customer Details
                customerName:
                    row["Customer Name"]?.toString().trim() || "",

                phoneNumber:
                    row["Phone No"]?.toString().trim() || "",

                address:
                    row["Address"]?.toString().trim() || "",

                // Destination Details
                destinationCity:
                    row["Destination City"]?.toString().trim() || "",

                pincode:
                    row["PIN Code"]?.toString().trim() || "",

                // Weight Details
                weight:
                    parseFloat(row["Weight (kg)"]) || 0,

                actualWeight:
                    parseFloat(row["Actual Weight"]) || 0,

                volumetricWeight:
                    parseFloat(row["Volumetric Weight"]) || 0,

                // Dimensions
                length:
                    parseFloat(row["Length"]) || 0,

                width:
                    parseFloat(row["Width"]) || 0,

                height:
                    parseFloat(row["Height"]) || 0,

                // Charges
                deliveryCharge:
                    parseFloat(
                        row["Delivery Charge (₹)"]
                    ) || 0,

                // Courier
                courierPartner:
                    row["Courier Partner"]?.toString().trim() ||
                    "Delhivery",

                // Status
                status:
                    row["Status"]?.toString().trim() ||
                    "Pending",

                comments:
                    row["Comments"]?.toString().trim() || "",

                // Dates
                orderDate:
                    parseExcelDate(row["Order Date"]),

                expectedDeliveryDate:
                    parseExcelDate(
                        row["Expected Delivery Date"]
                    ),

                firstAttemptDate:
                    parseExcelDate(row["1st Attempt"]),

                secondAttemptDate:
                    parseExcelDate(row["2nd Attempt"]),

                thirdAttemptDate:
                    parseExcelDate(row["3rd Attempt"]),

                deliveredDate:
                    parseExcelDate(row["Delivered Date"]),

                // Delivery Details
                receiverName:
                    row["Receiver Name"]?.toString().trim() || "",

            }))
            .filter(
                (order) =>
                    order.awbNumber &&
                    order.orderNumber
            );

        // Insert Orders
        await Order.insertMany(sanitizedOrders);

        // Save Upload History
        await UploadHistory.create({

            _id: historyId,

            fileName: req.file.originalname,

            totalRows: sanitizedOrders.length,

            uploadedBy: req.user.id,

            isVisible: true,

        });

        // Success Response
        return res.status(200).json({
            success: true,
            message: `${sanitizedOrders.length} orders imported successfully`
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = uploadFileController;