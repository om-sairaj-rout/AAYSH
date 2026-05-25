const Order = require("../../models/upload/order.model");

const getOrderByAwb = async (req, res) => {
  try {
    const { awbNumber } = req.params;

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required",
      });
    }

    const order = await Order.findOne({ awbNumber });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No such AWB number found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("AWB search error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching AWB",
    });
  }
};

module.exports = getOrderByAwb ;