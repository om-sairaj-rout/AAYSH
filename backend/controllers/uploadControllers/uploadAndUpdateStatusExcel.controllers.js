const XLSX = require("xlsx");

const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Company = require("../../models/company.model");
const {
  buildOrderScopeForCompany,
} = require("../../utils/companyScope");
const Tracking = require("../../models/upload/tracking.model");
const notifyShippingStatusWhatsApp = require("../../utils/notifyShippingStatusWhatsApp");
const {
  startDeliveryAttempt,
  failCurrentDeliveryAttempt,
  completeCurrentDeliveryAttempt,
} = require("../../utils/deliveryAttemptService");

const parseExcelDate = (value) => {
  if (!value) return new Date();

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  if (typeof value === "number") {
  const d = XLSX.SSF.parse_date_code(value);

  const istOffset = 5.5 * 60 * 60 * 1000;

return new Date(
  Date.UTC(
    d.y,
    d.m - 1,
    d.d,
    d.H,
    d.M,
    d.S
  ) - istOffset
);
}

  return new Date();
};

const uploadAndUpdateStatusExcel = async (req, res) => {
  try {
    const { companyID } = req.params;
    const file = req.file;

    const company = await Company.findOne({
      companyID: String(companyID).trim().toUpperCase(),
    })
      .select("companyID")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const orderScope = buildOrderScopeForCompany(company.companyID);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const statusMap = {
  "booked": "Booked",
  "shipped": "Shipped",
  "in transit": "In Transit",
  "out for delivery": "Out For Delivery",
  "out for delivery ": "Out For Delivery",
  "delivered": "Delivered",
  "cancelled": "Cancelled",
  "canceled": "Cancelled",
  "rto": "RTO",
  "returned": "Returned",
  "exchange": "Exchange",
  "Pending": "Pending",
  "delayed": "Delayed",
  "undelivered": "Undelivered",
  "delivery attempt failed": "Undelivered",
};

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

      const rawStatus = (
  row["New Status"] ||
  row["Status"] ||
  ""
)
  .toString()
  .trim();

const status =
  statusMap[rawStatus.toLowerCase()] || null;

      const location =
        (row["Location"] || "")
          .toString()
          .trim();

      const remarks =
        (row["Remarks"] || "")
          .toString()
          .trim();

      const failureReason =
  (row["Failure Reason"] || "")
    .toString()
    .trim();

      const trackingDateTime =
  row["Tracking Date & Time"] ||
  row["Tracking Date"] ||
  "";

  console.log(row["Tracking Date & Time"]);
console.log(typeof row["Tracking Date & Time"]);

  let eventTime = parseExcelDate(trackingDateTime);

  console.log("Parsed:", eventTime);

      if (!awb) {
        invalidRows.push({
          awb: "MISSING",
          reason: "AWB missing",
        });
        continue;
      }

      if (!status) {
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
          ...orderScope,
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

      const previousStatus = shipping.shippingStatus;
      shipping.shippingStatus = status;

     switch (status) {
  case "Booked":
    if (!shipping.bookedAt)
      shipping.bookedAt = eventTime;
    break;

  case "Shipped":
    if (!shipping.shippedAt)
      shipping.shippedAt = eventTime;
    break;

  case "In Transit":
    shipping.inTransitAt = eventTime;
    break;

  case "Out For Delivery":
  shipping.outForDeliveryAt = eventTime;
  startDeliveryAttempt(shipping, eventTime);
  break;

  case "Delivered":
    shipping.deliveredAt = eventTime;
    completeCurrentDeliveryAttempt(shipping, eventTime);
    break;

  case "Undelivered":
  failCurrentDeliveryAttempt(shipping, failureReason, eventTime);
  break;

  case "Cancelled":
    shipping.cancelledAt = eventTime;
    break;

  case "RTO":
    shipping.rtoAt = eventTime;
    break;

  case "Returned":
    shipping.returnedAt = eventTime;
    break;

  case "Exchange":
    shipping.exchangeAt = eventTime;
    break;

  case "Delayed":
    shipping.delayedAt = eventTime;
    break;

  default:
    break;
}

      await shipping.save();

      notifyShippingStatusWhatsApp({
        shipping,
        previousStatus,
        newStatus: status,
      }).catch((err) => {
        console.error("WhatsApp notification failed:", err.message);
      });

      // ==========================
      // Update Order Dashboard
      // ==========================

      if (
        status === "Delivered" &&
        !order.deliveryDate
      ) {
        order.deliveryDate =
  shipping.deliveredAt ||
  eventTime;
      }

      await order.save();

      // ==========================
      // Prevent duplicate tracking
      // ==========================

      const lastTracking = await Tracking.findOne({
  shippingId: shipping._id,
}).sort({ eventTime: -1 });

const isDuplicate =
  lastTracking &&
  lastTracking.status === status &&
  lastTracking.location === location &&
  lastTracking.remarks === remarks &&
  lastTracking.failureReason === failureReason &&
  lastTracking.eventTime?.getTime() === eventTime.getTime();

if (!isDuplicate) {
  await Tracking.create({
    shippingId: shipping._id,
    status,
    location,
    remarks,
    failureReason,
    eventTime,
    updatedBy: req.user?.id || null,
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