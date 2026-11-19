const { runDelhiveryCodPrecheck } = require("../../services/delhivery/delhiveryCodPrecheck");

const delhiveryCodPrecheck = async (req, res) => {
  try {
    const destination =
      req.query.destination_pin ||
      req.query.destination_pincode ||
      req.query.filter_codes ||
      req.body?.destination_pin ||
      req.body?.billing_pincode ||
      req.body?.destination_pincode;

    const paymentMethod =
      req.query.payment_method ||
      req.body?.payment_method ||
      "COD";

    const serviceType =
      req.query.service_type || req.body?.service_type || "surface";

    const expectedPickupDate =
      req.query.expected_pickup_date ||
      req.body?.expected_pickup_date ||
      null;

    const companyID =
      req.query.company_id ||
      req.body?.company_id ||
      req.user?.companyID ||
      "";

    const delhiveryProductType =
      req.query.delhivery_product_type ||
      req.body?.delhivery_product_type ||
      null;

    const result = await runDelhiveryCodPrecheck({
      destinationPincode: destination,
      companyID,
      paymentMethod,
      serviceType,
      expectedPickupDate,
      delhiveryProductType,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Delhivery precheck failed",
    });
  }
};

module.exports = delhiveryCodPrecheck;
