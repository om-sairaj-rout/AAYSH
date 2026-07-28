const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");


// Generate random 8 digit id
const generateId = () => {
  return Math.floor(
    10000000 + Math.random() * 90000000
  ).toString();
};

// Generate unique id for any model
const generateUniqueId = async (Model, field) => {
  let id;

  while (true) {
    id = generateId();

    const exists = await Model.findOne({
      [field]: id,
    });

    if (!exists) {
      return id;
    }
  }
};


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
    // Duplicate Order Check
    // ===============================

    const existingOrder = await Order.findOne({
      externalOrderId: body.order_id
    });


    if(existingOrder){

      return res.status(400).json({
        success:false,
        error:"Order already exists"
      });

    }



   // ===============================
// Generate IDs
// ===============================

const orderId = await generateUniqueId(
  Order,
  "orderId"
);

const shipmentId = await generateUniqueId(
  Shipping,
  "shipmentId"
);



    // ===============================
    // Create Order
    // ===============================


    const order = await Order.create({

      uploadedBy:req.user.id,


      // Your internal id
      orderId,


      // Client order id
      externalOrderId:
      body.order_id,



      orderDate:
      body.order_date
      ? new Date(body.order_date)
      : new Date(),



      pickupDate:
      body.order_date
      ? new Date(body.order_date)
      : new Date(),



      pickupLocation:
      body.pickup_location,



      // ===============================
      // Customer Mapping
      // ===============================


      consignorName:
      body.consignor_name || "",


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



      shippingIsBilling:
      body.shipping_is_billing ?? true,




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




      invoiceValue:
      body.sub_total || 0,



      subTotal:
      body.sub_total || 0,



      shippingCharges:
      body.shipping_charges || 0,



      giftwrapCharges:
      body.giftwrap_charges || 0,



      transactionCharges:
      body.transaction_charges || 0,



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



      courierStatus:
      "Not Shipped"

    });



    // ===============================
    // Create Shipping Record
    // ===============================


    const shipping = await Shipping.create({

  orderId: order._id,

  shipmentId,

  pickupLocation: body.pickup_location,

  shippingStatus: "Not Shipped",

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
      order.orderId,


      shipment_id:
shipping.shipmentId,


      status:
      "NEW",


      status_code:
      1,


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