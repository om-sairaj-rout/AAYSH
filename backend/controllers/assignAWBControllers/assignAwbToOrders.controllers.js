const Awb = require("../../models/awb/awb.model");
const Order = require("../../models/upload/order.model");


// ================= CATEGORY LOGIC =================
// Missing / 0 / >3kg = over3kg
// <=3kg = under3kg
const getAwbCategory = (weight,isPrime) => {

  if (isPrime) {
    return "prime";
  }

  if (!weight || weight > 3) {
    return "over3kg";
  }

  if(weight <= 1){
    return "under1kg";
  }

  return "over3kg";
};


const assignAwbToOrders = async (req, res) => {
  try {

    const { courierId, orders, isPrime } = req.body;
    console.log("REQUEST BODY:", req.body);

    if (!courierId || !orders?.length) {
      return res.status(400).json({
        success: false,
        message: "Courier and orders required"
      });
    }

    const updatedOrders = [];

    // ================= LOOP THROUGH ORDERS =================
    for (const item of orders) {

      const category =
        getAwbCategory(item.weight, isPrime);
        console.log("CATEGORY:", category);

      // ================= FIND NEXT AVAILABLE AWB =================
      // FIFO sequence using oldest createdAt
      console.log({
  courierId,
  category,
  status: "available"
});
      const awb =
        await Awb.findOneAndUpdate(
          {
            courierId,
            category,
            status: "available",
          },
          {
            $set: {
              status: "booked",
              assignedOrder:
                item.orderId,
            },
          },
          {
            new: true,
            sort: {
              createdAt: 1,
            },
          }
        );
        console.log("FOUND AWB:", awb);

      // No AWB available
      if (!awb) {
        continue;
      }

      // ================= UPDATE ORDER =================
      const order =
        await Order.findById(
          item.orderId
        );

      if (!order) {
        continue;
      }

      order.awbNumber =
        awb.awbNumber;

      order.courierId =
        courierId;

      order.courierStatus =
        "Booked";

      if (!order.bookedAt) {
  order.bookedAt = new Date();
}

      await order.save();

      updatedOrders.push({
        orderId: order._id,
        awbNumber:
          awb.awbNumber,
        category,
      });
    }

    // ================= RESPONSE =================
    if (!updatedOrders.length) {
      return res.status(400).json({
        success: false,
        message:
          "No AWB available for selected courier/category",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "AWB assigned successfully",
      data: updatedOrders,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message:
        "Server error during AWB assignment",
    });
  }
};

module.exports =
  assignAwbToOrders;