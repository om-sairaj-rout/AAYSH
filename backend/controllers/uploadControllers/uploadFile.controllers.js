const xlsx = require("xlsx");
const mongoose = require("mongoose");

const Order = require("../../models/upload/order.model");
const UploadHistory = require("../../models/upload/uploadHistory.model");

const uploadFileController = async (req, res) => {

    try {

        console.log("USER:", req.user);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const workbook = xlsx.read(req.file.buffer, {
            type: "buffer"
        });

        const rawData = xlsx.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]]
        );

        if (rawData.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Excel sheet is empty"
            });
        }

        const historyId = new mongoose.Types.ObjectId();

        const sanitizedOrders = rawData.map((row) => ({

            historyId,

            uploadedBy: req.user.id,

            orderNumber: row["Order No"] || "",

            awbNumber: row["AWB No"] || "",

            weight: parseFloat(row["Weight (kg)"]) || 0,

            customerName: row["Customer Name"] || "",

            destinationCity: row["Destination City"] || "",

            pincode: row["PIN Code"] || "",

            courierPartner: row["Courier Partner"] || "Delhivery",

            status: row["Status"] || "Pending",

        })).filter(order =>
            order.awbNumber &&
            order.orderNumber
        );

        await Order.insertMany(sanitizedOrders);

        await UploadHistory.create({

            _id: historyId,

            fileName: req.file.originalname,

            totalRows: sanitizedOrders.length,

            uploadedBy: req.user.id,

            isVisible: true,

        });

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