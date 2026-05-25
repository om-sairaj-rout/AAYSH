const Order = require(
  "../../models/upload/order.model"
);

const orderCalculations = require(
  "../../utils/orderCalculations"
);

const getOrdersByDate = async (
  req,
  res
) => {

  try {

    const {
      fromDate,
      toDate,
    } = req.query;

    const startDate =
      new Date(fromDate);

    startDate.setHours(
      0,
      0,
      0,
      0
    );

    const endDate =
      new Date(toDate);

    endDate.setHours(
      23,
      59,
      59,
      999
    );

    let filter = {
      pickupDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (
      req.user.role !== "admin"
    ) {
      filter.uploadedBy =
        req.user.id;
    }

    const orders =
      await Order.find(filter)
        .sort({
          pickupDate: -1,
        });

    // DYNAMIC CALCULATIONS
    const updatedOrders = orders.map(
      (order) => {

        const calculations =
          orderCalculations(order);

        return {
          ...order.toObject(),
          ...calculations,
        };
      }
    );

    return res.status(200).json({
      success: true,
      orders: updatedOrders,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports =
  getOrdersByDate;