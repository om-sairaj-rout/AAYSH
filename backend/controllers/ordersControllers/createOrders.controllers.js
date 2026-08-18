const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Company = require("../../models/company.model");
const getCategory = require("../../utils/categoryMapper");
const getExpectedHours = require("../../utils/tatMapper");
const {
  calculateInvoiceValue,
  calculateItemsSubTotal,
} = require("../../utils/invoiceCalculations");
const { parseISODateOnly, now } = require("../../utils/dateTime");


// Generate random 8 digit id
const generateId = () => {
  return Math.floor(
    10000000 + Math.random() * 90000000
  ).toString();
};

// Generate unique shipment id
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
const generateInvoiceNo = () => {
  return `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// =========================================
// Create Order
// =========================================

const createCustomOrder = async (req, res) => {

  try {

    const body = req.body;


    // ===============================
    // Validation
    // ===============================

    if (
      !body.order_id ||
      !body.pickup_location ||
      !Array.isArray(body.order_items) ||
      body.order_items.length === 0
    ) {
      return res.status(400).json({
        success:false,
        error:
        "Missing required fields. Required: order_id, pickup_location, order_items"
      });
    }



    // ===============================
    // Duplicate Order Check (per company)
    // ===============================

    const companyID = String(
      body.company_id ||
      body.companyID ||
      req.user.companyID ||
      ""
    )
      .trim()
      .toUpperCase();

    const existingOrder = await Order.findOne({
      externalOrderId: body.order_id,
      companyID,
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        error: "Duplicate Order ID already exists for your company",
      });
    }

    // ===============================
    // Generate IDs
    // ===============================

const shipmentId = await generateUniqueShipmentId();


    // ===============================
    // Create Order
    // ===============================
    const category = getCategory(
  body.billing_city,body.billing_state
);

const serviceType = "surface";

const expectedHours =
  getExpectedHours(category,serviceType);

    let consignorName = String(body.consignor_name || "").trim();

    if (!consignorName) {
      consignorName = String(req.user.companyName || "").trim();
    }

    if (!consignorName && companyID) {
      const company = await Company.findOne({ companyID })
        .select("companyName")
        .lean();

      if (company?.companyName) {
        consignorName = String(company.companyName).trim();
      }
    }

    const order = await Order.create({

      uploadedBy:req.user.id,
      companyID,




      // Client order id
      externalOrderId:
      body.order_id,



      orderDate:
      body.order_date
      ? parseISODateOnly(body.order_date) || now()
      : now(),



      // ===============================
      // Customer Mapping
      // ===============================


      consignorName,

      consignorPhone:
        String(body.consignor_phone || req.user.mobile_number || "").trim(),

      consigneeName:
      body.billing_customer_name || "",


      consigneeLastName:
      body.billing_last_name || "",



      address:
      body.billing_address || "",



      address2:
      body.billing_address_2 || "",



      destinationCity:
      body.billing_city || "",



      destinationState:
      body.billing_state || "",



      destinationPincode:
      String(body.billing_pincode || ""),



      destinationCountry:
      body.billing_country || "India",



      consigneeEmail:
      body.billing_email || "",



      billingPhone:
      body.billing_phone || "",


      // ===============================
      // Order Details
      // ===============================


      paymentMethod:
      body.payment_method || "COD",



      comment:
      body.comment || "",




      orderItems:

      body.order_items.map(item => ({

        name:
        item.name || "",


        sku:
        item.sku || "",


        units:
        item.units || 1,


        sellingPrice:
        item.selling_price || 0,


        discount:
        item.discount || 0,


        tax:
        item.tax || 0,


        hsn:
        String(item.hsn || "")

      })),




      qty:

      body.order_items.reduce(
        (total,item)=>
        total + Number(item.units || 0),
        0
      ),




      subTotal: calculateItemsSubTotal(
        body.order_items.map((item) => ({
          units: item.units || 1,
          sellingPrice: item.selling_price || 0,
          discount: item.discount || 0,
          tax: item.tax || 0,
        }))
      ),

shippingCharges:
Number(body.shipping_charges || 0),

giftwrapCharges:
Number(body.giftwrap_charges || 0),

transactionCharges:
Number(body.transaction_charges || 0),

invoiceNo:
generateInvoiceNo(),

invoiceValue:
calculateInvoiceValue({
  orderItems: body.order_items.map((item) => ({
    units: item.units || 1,
    sellingPrice: item.selling_price || 0,
    discount: item.discount || 0,
    tax: item.tax || 0,
  })),
  shippingCharges: body.shipping_charges,
  giftwrapCharges: body.giftwrap_charges,
  transactionCharges: body.transaction_charges,
}),



      totalDiscount:
      body.total_discount || 0,




      // ===============================
      // Package
      // ===============================


      weight:
      body.weight || 0,


      length:
      body.length || 0,


      breadth:
      body.breadth || 0,


      height:
      body.height || 0,



category,

expectedHours,

    });



    // ===============================
    // Create Shipping Record
    // ===============================


    const shipping = await Shipping.create({

  orderId: order._id,

  shipmentId,

  pickupLocation: body.pickup_location,

  shippingStatus: "Pending",

  serviceType,

  totalWeight: body.weight || 0,

  shippingCharges: body.shipping_charges || 0

});



    // ===============================
    // Response
    // ===============================


    return res.status(201).json({

      success:true,

      message:
      "Order created successfully",

      order_id:
order.externalOrderId,

      shipment_id:
shipping.shipmentId,

      status:
      "NEW",

      awb_code:
      null,

      courier_name:
      null,

      billing_phone:
      order.billingPhone

    });



  } catch(error){

    console.error(error);


    return res.status(500).json({

      success:false,

      error:
      "Failed to create order",

      message:
      error.message

    });

  }

};


module.exports = createCustomOrder;