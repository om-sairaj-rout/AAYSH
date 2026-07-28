const XLSX = require("xlsx");

const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");

const uploadAndUpdateStatusExcel = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const validStatuses = new Set([
      "Booked",
      "Shipped",
      "In Transit",
      "Out For Delivery",
      "Delivered",
      "Cancelled",
      "Delayed",
      "RTO",
    ]);

    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
    });

    const sheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ];

    const rows =
      XLSX.utils.sheet_to_json(sheet);

    let updated = 0;
    let notFound = 0;
    const invalidRows = [];

    for (const row of rows) {
      const awb = (
        row["AWB Number"] ||
        row["AWB"] ||
        row["awbNumber"] ||
        ""
      )
        .toString()
        .trim();

      const status =
        row["Status"]?.toString().trim();

      const location =
        (row["Location"] || "")
          .toString()
          .trim();

      const remarks =
        (row["Remarks"] || "")
          .toString()
          .trim();

      if (!awb) {
        invalidRows.push({
          awb: "MISSING",
          reason: "AWB missing",
        });
        continue;
      }

      if (!validStatuses.has(status)) {
        invalidRows.push({
          awb,
          reason: "Invalid status",
        });
        continue;
      }

      // ==========================
      // Find Shipping by AWB
      // ==========================

      const shipping =
        await Shipping.findOne({
          awbNumber: awb,
        });

      if (!shipping) {
        notFound++;

        invalidRows.push({
          awb,
          reason: "Shipment not found",
        });

        continue;
      }

      // ==========================
      // Find Order
      // ==========================

      const order =
        await Order.findOne({
          _id: shipping.orderId,
          uploadedBy: userId,
        });

      if (!order) {
        notFound++;

        invalidRows.push({
          awb,
          reason: "Order not found",
        });

        continue;
      }

      // ==========================
      // Update Shipping
      // ==========================

      shipping.shippingStatus = status;

      switch (status) {
        case "Booked":
          if (!shipping.bookedAt)
            shipping.bookedAt = new Date();
          break;

        case "Shipped":
          if (!shipping.shippedAt)
            shipping.shippedAt = new Date();
          break;

        case "Out For Delivery":
          if (!shipping.outForDeliveryAt)
            shipping.outForDeliveryAt =
              new Date();
          break;

        case "Delivered":
          if (!shipping.deliveredAt)
            shipping.deliveredAt =
              new Date();
          break;

        default:
          break;
      }

      await shipping.save();

      // ==========================
      // Update Order Dashboard
      // ==========================

      order.courierStatus = status = status;

      if (
        status === "Delivered" &&
        !order.deliveryDate
      ) {
        order.deliveryDate =
          shipping.deliveredAt ||
          new Date();
      }

      await order.save();

      // ==========================
      // Prevent duplicate tracking
      // ==========================

      const lastTracking =
        await Tracking.findOne({
          shippingId: shipping._id,
        }).sort({
          eventTime: -1,
        });

      if (
        !lastTracking ||
        lastTracking.status !== status ||
        lastTracking.location !== location
      ) {
        await Tracking.create({
          shippingId: shipping._id,
          status,
          location,
          remarks,
          updatedBy:
            req.user?.id || null,
        });
      }

      updated++;
    }

    return res.json({
      success: true,
      updated,
      notFound,
      invalidRows,
      message:
        "Tracking updated successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports =
  uploadAndUpdateStatusExcel;