const RateStructure = require("../../models/rateStructure.model");
const PincodeServiceability = require("../../models/upload/serviceability.model");
const { RATE_ZONES } = require("../../constants/rateZones");
const {
  normalizeService,
  calculateRate,
} = require("../../utils/rateCalculator");
const { calculateFinalOrderRate } = require("../../utils/calculateFinalOrderRate");

const resolveZone = async ({ zone, destinationPincode }) => {
  if (zone && RATE_ZONES.includes(zone)) {
    return { zone, source: "manual" };
  }

  const pincode = String(destinationPincode || "").trim();
  if (!pincode) {
    return { zone: null, source: null };
  }

  const serviceability = await PincodeServiceability.findOne({ pincode }).lean();
  if (!serviceability?.zone) {
    return { zone: null, source: null, pincode };
  }

  return { zone: serviceability.zone, source: "pincode", pincode };
};

const calculateRateController = async (req, res) => {
  try {
    const {
      service,
      weight,
      length = 0,
      breadth = 0,
      height = 0,
      zone,
      destinationPincode,
      companyID,
      paymentMethod,
      invoiceValue,
    } = req.body;

    const normalizedService = normalizeService(service);
    const zoneInfo = await resolveZone({ zone, destinationPincode });

    if (!zoneInfo.zone) {
      return res.status(400).json({
        success: false,
        message: zoneInfo.pincode
          ? `Zone not found for pincode ${zoneInfo.pincode}. Select a zone manually.`
          : "Destination zone or pincode is required.",
      });
    }

    const useFinalRate =
      companyID ||
      paymentMethod !== undefined ||
      invoiceValue !== undefined;

    if (useFinalRate) {
      if (
        invoiceValue === undefined ||
        invoiceValue === null ||
        String(invoiceValue).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "invoice_value is required for full rate calculation.",
        });
      }
    }

    const result = useFinalRate
      ? await calculateFinalOrderRate({
          companyID,
          service: normalizedService,
          weight,
          length,
          breadth,
          height,
          zone: zoneInfo.zone,
          paymentMethod,
          invoiceValue,
        })
      : calculateRate({
          service: normalizedService,
          weight,
          length,
          breadth,
          height,
          zone: zoneInfo.zone,
          slabs: (
            await RateStructure.findOne({ service: normalizedService }).lean()
          )?.slabs || [],
        });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        zoneSource: zoneInfo.source,
        destinationPincode: zoneInfo.pincode || destinationPincode || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = calculateRateController;
