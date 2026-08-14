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
} = require("../../utils/invoiceCalculations");
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

      if (externalOrderId) {
  const alreadyExists = await Order.exists({
    externalOrderId,
  });

  if (alreadyExists) {
    continue;
  }
}

      const orderDoc = {
        // ==========================
        // Upload
        // ==========================

        historyId,
        uploadedBy: req.user.id,

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

qty: Number(row["Units"]) || 0,

subTotal: calculateItemsSubTotal([
  {
    units: Number(row["Units"]) || 1,
    sellingPrice: Number(row["Selling Price"]) || 0,
    discount: Number(row["Discount"]) || 0,
    tax: Number(row["Tax"]) || 0,
  },
]),

shippingCharges:
  Number(row["Shipping Charges"]) || 0,

giftwrapCharges:
  Number(row["Giftwrap Charges"]) || 0,

transactionCharges:
  Number(row["Transaction Charges"]) || 0,

invoiceNo: await generateUniqueInvoiceNo(),

invoiceValue: calculateInvoiceValue({
  orderItems: [
    {
      units: Number(row["Units"]) || 1,
      sellingPrice: Number(row["Selling Price"]) || 0,
      discount: Number(row["Discount"]) || 0,
      tax: Number(row["Tax"]) || 0,
    },
  ],
  shippingCharges: Number(row["Shipping Charges"]) || 0,
  giftwrapCharges: Number(row["Giftwrap Charges"]) || 0,
  transactionCharges: Number(row["Transaction Charges"]) || 0,
}),

        totalDiscount:
  Number(row["Total Discount"]) || 0,

        // ==========================
        // Package
        // ==========================

        weight:
          Number(row["Weight"]) || 0,

        length:
          Number(row["Length"]) || 0,

        breadth:
          Number(row["Breadth"]) || 0,

        height:
          Number(row["Height"]) || 0,

        // ==========================
        // Dashboard
        // ==========================


        category,

        expectedHours,
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
          orderDoc.weight,
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