const { checkHeavyPincodeServiceability } = require("../../services/delhivery/delhiveryHeavyServiceability");

const delhiveryHeavyServiceability = async (req, res) => {
  try {
    const pin =
      req.query.pincode ||
      req.query.destination_pin ||
      req.query.filter_codes ||
      req.body?.pincode ||
      req.body?.destination_pin;

    const result = await checkHeavyPincodeServiceability(pin);

    if (result.api_error) {
      const status =
        result.error_code === "AUTH_ERROR"
          ? 401
          : result.error_code === "INVALID_PINCODE"
            ? 400
            : 502;
      return res.status(status).json({
        success: false,
        ...result,
      });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Delhivery Heavy serviceability failed",
    });
  }
};

module.exports = delhiveryHeavyServiceability;
