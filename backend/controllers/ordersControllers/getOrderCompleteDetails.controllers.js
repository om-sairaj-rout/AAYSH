const { fetchOrderCompleteDetails } = require("../../services/orderCompleteDetails.service");

const getOrderCompleteDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await fetchOrderCompleteDetails(orderId);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(result.status).json(result.payload);
  } catch (err) {
    console.error("[getOrderCompleteDetails]", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching order details",
    });
  }
};

module.exports = getOrderCompleteDetails;