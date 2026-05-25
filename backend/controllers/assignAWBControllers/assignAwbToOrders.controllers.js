const Awb = require("../../models/awb/awb.model");
const Order = require("../../models/upload/order.model");


// ================= CATEGORY LOGIC =================
// Missing / 0 / >1kg = over1kg
// <=1kg = under1kg
const getAwbCategory = (weight) => {

  if (!weight || weight > 1) {
    return "over1kg";
  }

  return "under1kg";
};


const assignAwbToOrders = async (req, res) => {
  try {

    const { courierId, orders } = req.body;

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
        getAwbCategory(item.weight);

      // ================= FIND NEXT AVAILABLE AWB =================
      // FIFO sequence using oldest createdAt
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