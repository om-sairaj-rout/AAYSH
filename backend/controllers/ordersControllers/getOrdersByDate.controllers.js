const Order = require("../../models/upload/order.model");
const UploadHistory = require("../../models/upload/uploadHistory.model");

const getOrdersByDate = async (req, res) => {

  try {

    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "From and To date required"
      });
    }

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    let orders = [];

    // ADMIN -> FULL DATABASE
    if (req.user.role === "admin") {

      orders = await Order.find({
        orderDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ orderDate: -1 });

    }

    // NORMAL USER -> ONLY THEIR DATA
    else {

      const histories = await UploadHistory.find({
        uploadedBy: req.user.id,
        isVisible: true
      });

      const historyIds = histories.map(
        (item) => item._id
      );

      orders = await Order.find({
        historyId: { $in: historyIds },
        orderDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ orderDate: -1 });

    }

    res.status(200).json({
      success: true,
      orders
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

module.exports = getOrdersByDate;