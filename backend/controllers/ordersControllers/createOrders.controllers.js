const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");


// Generate 8 digit order number
const generateOrderId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};


const createCustomOrder = async (req, res) => {
  try {

    const body = req.body;


    // ==========================
    // Validation
    // ==========================

    if (
      !body.order_id ||
      !body.pickup_location ||
      !Array.isArray(body.order_items) ||
      body.order_items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Required fields: order_id, pickup_location, order_items"
      });
    }



    // ==========================
    // Duplicate Check
    // ==========================

    const existingOrder = await Order.findOne({
      externalOrderId: body.order_id,
    });


    if (existingOrder) {
      return res.status(400).json({
        success:false,
        error:"Order already exists",
      });
    }



    // ==========================
    // Generate Internal Order ID
    // ==========================

    let generatedOrderId;

    let exists = true;


    while(exists){

      generatedOrderId = generateOrderId();

      const check = await Order.findOne({
        orderId: generatedOrderId,
      });

      exists = !!check;
    }



    // ==========================
    // Create Order
    // ==========================

    const order = await Order.create({

      uploadedBy:req.user.id,

      // Your ID
      orderId: generatedOrderId,


      // Client order ID
      externalOrderId: body.order_id,


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


      // Customer mapping

      consigneeName:
        body.billing_customer_name || "",


      billingLastName:
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


      billingCountry:
        body.billing_country || "India",


      billingEmail:
        body.billing_email || "",


      billingPhone:
        body.billing_phone || "",


      contactNo:
        body.billing_phone || "",



      shippingIsBilling:
        body.shipping_is_billing ?? true,



      paymentMethod:
        body.payment_method || "COD",


      comment:
        body.comment || "",



      // Items

      orderItems:
        body.order_items.map(item => ({
          name:item.name || "",
          sku:item.sku || "",
          units:item.units || 1,
          sellingPrice:item.selling_price || 0,
          discount:item.discount || 0,
          tax:item.tax || 0,
          hsn:String(item.hsn || "")
        })),



      qty:
        body.order_items.reduce(
          (sum,item)=>sum + Number(item.units || 0),
          0
        ),



      subTotal:
        body.sub_total || 0,


      invoiceValue:
        body.sub_total || 0,


      shippingCharges:
        body.shipping_charges || 0,


      giftwrapCharges:
        body.giftwrap_charges || 0,


      transactionCharges:
        body.transaction_charges || 0,


      totalDiscount:
        body.total_discount || 0,



      // Package

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



    // ==========================
    // Create Shipping
    // ==========================


    const shipping = await Shipping.create({

      orderId:order._id,

      pickupLocation:
        body.pickup_location,


      shippingStatus:
        "Not Shipped",


      totalWeight:
        body.weight || 0,


      shippingCharges:
        body.shipping_charges || 0

    });



    // ==========================
    // Response
    // ==========================


    return res.status(201).json({

      success:true,

      message:"Order created successfully",


      order_id:
        order.orderId,


      reference_id:
        order.externalOrderId,


      shipment_id:
        shipping._id,


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

      error:"Failed to create order",

      message:error.message

    });

  }
};


module.exports = createCustomOrder;