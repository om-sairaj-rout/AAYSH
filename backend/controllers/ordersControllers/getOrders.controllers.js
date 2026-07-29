const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const getOrdersController = async (req, res) => {
  try {

    const { status } = req.query;

    const isAdmin = req.user.role === "admin";

    let filter = {};

    // =========================
    // USER FILTER
    // =========================
    if (!isAdmin) {
      filter.uploadedBy = req.user.id;
    }


    // =========================
    // FETCH ORDERS
    // =========================
    let orders = await Order.find(filter)
      .sort({ pickupDate: 1 })
      .lean();


    // =========================
    // ATTACH SHIPPING DATA
    // =========================
    const finalOrders = await Promise.all(
      orders.map(async(order)=>{

        const shipping = await Shipping.findOne({
          orderId: order._id
        }).lean();


        return {
          ...order,
          shipping: shipping || {
            shippingStatus:"Pending"
          }
        };

      })
    );


    // =========================
    // STATUS FILTER
    // =========================
    let filteredOrders = finalOrders;


    if(status && status !== "All Orders"){

      filteredOrders = finalOrders.filter(
        order =>
          order.shipping.shippingStatus === status
      );

    }


    return res.status(200).json({
      success:true,
      orders:filteredOrders
    });


  } catch(error){

    console.log(error);

    return res.status(500).json({
      success:false,
      message:error.message
    });

  }
};


module.exports = getOrdersController;