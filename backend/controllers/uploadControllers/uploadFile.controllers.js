const xlsx = require("xlsx");
const mongoose = require("mongoose");

const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const UploadHistory = require("../../models/upload/uploadHistory.model");

const getCategory = require("../../utils/categoryMapper");
const getExpectedHours = require("../../utils/tatMapper");
const {
  calculateInvoiceValue,
  calculateItemsSubTotal,
  resolveInvoiceFields,
} = require("../../utils/invoiceCalculations");
const { resolveOrderWeights } = require("../../utils/weightCalculations");
const { parseNoOfBoxes } = require("../../utils/parseNoOfBoxes");
const {
  parseISODateOnly,
  parseISODateTime,
} = require("../../utils/dateTime");

// =========================================
// Parse Excel Date
// =========================================

const parseExcelDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return parseISODateOnly(trimmed);
    }
    return parseISODateTime(trimmed);
  }

  if (typeof value === "number") {
    return parseISODateTime(new Date((value - 25569) * 86400 * 1000));
  }

  return null;
};

// =========================================
// Generate Random 8 Digit ID
// =========================================

const generateId = () => {
  return Math.floor(
    10000000 + Math.random() * 90000000
  ).toString();
};


// =========================================
// Generate Unique Shipment ID
// =========================================

const generateUniqueShipmentId = async () => {
  let id;

  while (true) {
    id = generateId();

    const exists = await Shipping.findOne({
      shipmentId: id,
    });

    if (!exists) {
      return id;
    }
  }
};

// =========================================
// Generate Invoice Number
// =========================================
const generateUniqueInvoiceNo = async () => {
  while (true) {
    const invoiceNo = `INV-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const exists = await Order.exists({ invoiceNo });

    if (!exists) {
      return invoiceNo;
    }
  }
};
// =========================================
// Upload Controller
// =========================================

const uploadFileController = async (req, res) => {
  try {
    // =====================================
    // Validation
    // =====================================

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

    // =====================================
    // Read Excel
    // =====================================

    const workbook = xlsx.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "Excel sheet not found.",
      });
    }

    const rawData = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel sheet is empty.",
      });
    }


    const historyId = new mongoose.Types.ObjectId();
    const companyID = String(req.user.companyID || "")
      .trim()
      .toUpperCase();

    const rowOrderIds = rawData.map((row, index) => ({
      rowNumber: index + 1,
      externalOrderId: row["Order ID"]?.toString().trim() || "",
    }));

    const missingOrderIdRows = rowOrderIds
      .filter((row) => !row.externalOrderId)
      .map((row) => row.rowNumber);

    if (missingOrderIdRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing Order ID on row(s): ${missingOrderIdRows.join(", ")}`,
      });
    }

    const seenInFile = new Set();
    const duplicateInFile = [];

    rowOrderIds.forEach((row) => {
      if (seenInFile.has(row.externalOrderId)) {
        duplicateInFile.push(row.externalOrderId);
      } else {
        seenInFile.add(row.externalOrderId);
      }
    });

    if (duplicateInFile.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateInFile)];
      return res.status(400).json({
        success: false,
        message: `Duplicate Order ID in file: ${uniqueDuplicates.join(", ")}`,
        duplicateOrderIds: uniqueDuplicates,
      });
    }

    const orderIdsInFile = rowOrderIds.map((row) => row.externalOrderId);
    const existingOrders = await Order.find({
      externalOrderId: { $in: orderIdsInFile },
    })
      .select("externalOrderId companyID")
      .lean();

    if (existingOrders.length > 0) {
      const duplicateOrderIds = existingOrders.map(
        (order) => order.externalOrderId
      );
      return res.status(400).json({
        success: false,
        message: `Duplicate Order ID already exists: ${duplicateOrderIds.join(", ")}`,
        duplicateOrderIds,
      });
    }

    const orderDocs = [];
    const shippingDocs = [];

    // =========================================
    // Prepare Orders & Shipping
    // =========================================

    for (const [index, row] of rawData.entries()) {
      const orderDate = parseExcelDate(
  row["Order Date"]
);

      const category = getCategory(
  row["City"],row["State"]
);

      const expectedHours =
        getExpectedHours(category, "surface"); 

      const shipmentId =
        await generateUniqueShipmentId();

      const externalOrderId =
        row["Order ID"]?.toString().trim() || "";

      const providedInvoiceNo =
        row["Invoice No"] || row["Invoice Number"] || "";
      const resolvedInvoiceNo =
        providedInvoiceNo?.toString().trim() ||
        (await generateUniqueInvoiceNo());

      const invoiceFields = resolveInvoiceFields({
        invoiceNo: resolvedInvoiceNo,
        invoiceValue: row["Invoice Value"],
        orderItems: [
          {
            units: Number(row["Units"]) || 1,
            selling_price: Number(row["Selling Price"]) || 0,
            discount: Number(row["Discount"]) || 0,
            tax: Number(row["Tax"]) || 0,
          },
        ],
        shippingCharges: Number(row["Shipping Charges"]) || 0,
        giftwrapCharges: Number(row["Giftwrap Charges"]) || 0,
        transactionCharges: Number(row["Transaction Charges"]) || 0,
      });

      const weights = resolveOrderWeights({
        weight: Number(row["Weight"]) || 0,
        length: Number(row["Length"]) || 0,
        breadth: Number(row["Breadth"]) || 0,
        height: Number(row["Height"]) || 0,
      });

      let noOfBoxes;
      try {
        noOfBoxes = parseNoOfBoxes(row["No. of Boxes"]);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Row ${index + 2}: ${error.message}`,
        });
      }

      const orderDoc = {
        // ==========================
        // Upload
        // ==========================

        historyId,
        uploadedBy: req.user.id,
        companyID,

        // ==========================
        // IDs
        // ==========================

        externalOrderId,

        // ==========================
        // Dates
        // ==========================

        orderDate,

consignorName:
  row["Consignor Name"]?.toString().trim() || req.user.companyName || "",

consignorPhone:
  row["Consignor Phone"]?.toString().trim() ||
  String(req.user.mobile_number || "").trim(),

consigneeName:
  row["Customer Name"]?.toString().trim() || "",

consigneeLastName:
  row["Customer Last Name"]?.toString().trim() || "",

address:
  row["Address"]?.toString().trim() || "",

address2:
  row["Address 2"]?.toString().trim() || "",

destinationCity:
  row["City"]?.toString().trim() || "",

destinationState:
  row["State"]?.toString().trim() || "",

destinationPincode:
  String(row["Pincode"] || "").trim(),

destinationCountry:
  row["Country"]?.toString().trim() || "India",

consigneeEmail:
  row["Email"]?.toString().trim() || "",

billingPhone:
  String(row["Phone"] || "").trim(),

billingAlternatePhone:
  String(row["Alternate Phone"] || "").trim(),


        // ==========================
        // Order
        // ==========================

        paymentMethod:
          row["Payment Method"]?.toString().trim() === "Prepaid"
            ? "Prepaid"
            : "COD",

        comment:
          row["Comment"]?.toString().trim() || "",

        // ==========================
// Order Items
// ==========================

orderItems: [
  {
    name: row["Product Name"]?.toString().trim() || "",
    sku: row["SKU"]?.toString().trim() || "",
    units: Number(row["Units"]) || 0,
    sellingPrice: Number(row["Selling Price"]) || 0,
    discount: Number(row["Discount"]) || 0,
    tax: Number(row["Tax"]) || 0,
    hsn: row["HSN"]?.toString().trim() || "",
  },
],

subTotal: invoiceFields.subTotal,

shippingCharges:
  Number(row["Shipping Charges"]) || 0,

giftwrapCharges:
  Number(row["Giftwrap Charges"]) || 0,

transactionCharges:
  Number(row["Transaction Charges"]) || 0,

invoiceNo: invoiceFields.invoiceNo,

invoiceValue: invoiceFields.invoiceValue,

        totalDiscount:
  Number(row["Total Discount"]) || 0,

        weight: weights.actualWeight,
        actualWeight: weights.actualWeight,
        volumetricWeight: weights.volumetricWeight,
        chargeableWeight: weights.chargeableWeight,

        length:
          Number(row["Length"]) || 0,

        breadth:
          Number(row["Breadth"]) || 0,

        height:
          Number(row["Height"]) || 0,

        noOfBoxes,

        category,

        expectedHours,
        documents: [],
      };

      orderDocs.push(orderDoc);

      shippingDocs.push({
        externalOrderId, 

        shipmentId,

        pickupLocation:
          row["Pickup Location"]?.toString().trim() || req.user.address || "",

        shippingStatus: "Pending",

        shippingCharges:
          orderDoc.shippingCharges,

        totalWeight:
          weights.chargeableWeight,
      });
    }

    // =========================================
    // Insert Orders
    // =========================================

    let insertedOrders = [];

try {
  insertedOrders = await Order.insertMany(orderDocs, {
    ordered: false,
  });
} catch (err) {
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate Order ID already exists for your company.",
    });
  }

  console.log("Inserted:", err.insertedDocs?.length);

  if (err.writeErrors) {
    err.writeErrors.forEach((e, index) => {
      console.log(`Row ${index + 1}:`, e.errmsg || e.message);
    });
  }

  throw err;
}

    // =========================================
    // Attach MongoDB Order _id to Shipping
    // =========================================

   // =========================================
// Map Internal Order ID -> MongoDB _id
// =========================================

const orderIdMap = new Map();

insertedOrders.forEach((order) => {
  orderIdMap.set(order.externalOrderId, order._id);
});

// =========================================
// Prepare Shipping Records
// =========================================

const shippingRecords = shippingDocs
  .map((shipping) => ({
    orderId: orderIdMap.get(shipping.externalOrderId),

    shipmentId: shipping.shipmentId,

    pickupLocation: shipping.pickupLocation,

    shippingStatus: shipping.shippingStatus,

    shippingCharges: shipping.shippingCharges,

    totalWeight: shipping.totalWeight,
  }))
  .filter((shipping) => shipping.orderId);

    // =========================================
    // Insert Shipping Records
    // =========================================

    let insertedShipping = [];

try {
  insertedShipping =
    await Shipping.insertMany(
      shippingRecords,
      {
        ordered: false,
      }
    );
} catch (err) {
  insertedShipping =
    err.insertedDocs || [];
}

    // =========================================
    // Upload History
    // =========================================

   await UploadHistory.create({
  _id: historyId,
  fileName: req.file.originalname,
  totalRows: rawData.length,
  uploadedBy: req.user.id,
  companyID,
  isVisible: true,
});

    // =========================================
    // Success Response
    // =========================================

    return res.status(201).json({
      success: true,
      message: "Orders imported successfully.",

      total_rows: rawData.length,
      imported_orders: insertedOrders.length,
     shipping_created:
insertedShipping.length,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to import orders.",
      error: error.message,
    });
  }
};

module.exports = uploadFileController;