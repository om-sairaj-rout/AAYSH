const {
  assignOrdersWithCourierRouting,
} = require("../../utils/assignOrdersWithCourierRouting");

const assignAwbToOrders = async (req, res) => {
  try {
    const {
      serviceType,
      orders,
      pickupDate,
      pickupLocation,
      pickupTime,
      notes,
      delhiveryPickupLocationId,
      shipmentType,
      packagesByOrder,
      mpsPackages,
    } = req.body;

    const result = await assignOrdersWithCourierRouting(
      {
        serviceType,
        orders,
        pickupDate,
        pickupLocation,
        pickupTime,
        notes,
        delhiveryPickupLocationId,
        shipmentType,
        packagesByOrder,
        mpsPackages,
      },
      req.user
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: result.data,
        summary: result.summary,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      summary: result.summary,
      data: result.data,
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
