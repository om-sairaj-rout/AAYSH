const Awb = require("../../models/awb/awb.model");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Courier = require("../../models/awb/courier.model");

// ================= CATEGORY LOGIC =================
const getAwbCategory = (weight, isPrime) => {
  if (isPrime) return "prime";

  if (!weight || weight > 3) {
    return "over3kg";
  }

  if (weight <= 1) {
    return "under1kg";
  }

  return "over3kg";
};

const assignAwbToOrders = async (req, res) => {
  try {
    const { courierId, orders, isPrime } = req.body;

    if (!courierId || !orders?.length) {
      return res.status(400).json({
        success: false,
        message: "Courier and orders required",
      });
    }

    const courier = await Courier.findById(courierId);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    const updatedOrders = [];

    for (const item of orders) {
      const category = getAwbCategory(item.weight, isPrime);

      const awb = await Awb.findOneAndUpdate(
        {
          courierId,
          category,
          status: "available",
        },
        {
          $set: {
            status: "booked",
            assignedOrder: item.orderId,
          },
        },
        {
          new: true,
          sort: {
            createdAt: 1,
          },
        }
      );

      if (!awb) continue;

      const order = await Order.findById(item.orderId);

      if (!order) continue;


      await Shipping.findOneAndUpdate(
        {
          orderId: order._id,
        },
        {
          orderId: order._id,

          awbNumber: awb.awbNumber,

          courierId: courier._id,

          courierName: courier.name,

          shippingStatus: "Booked",

          bookedAt: new Date(),

          pickupLocation: "Primary",

          totalWeight: order.weight || 0,
        },
        {
          upsert: true,
          new: true,
        }
      );

order.pickupLocation = "Primary";
await order.save();

      updatedOrders.push({
        orderId: order._id,
        awbNumber: awb.awbNumber,
        courier: courier.name,
        category,
      });
    }

    if (!updatedOrders.length) {
      return res.status(400).json({
        success: false,
        message: "No AWB available for selected courier/category",
      });
    }

    return res.status(200).json({
      success: true,
      message: "AWB assigned successfully",
      data: updatedOrders,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server error during AWB assignment",
    });
  }
};

module.exports = assignAwbToOrders;