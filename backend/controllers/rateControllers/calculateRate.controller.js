const { RATE_ZONES } = require("../../constants/rateZones");
const { resolvePincodeRateZone } = require("../../utils/resolvePincodeRateZone");
const {
  normalizeService,
  calculateRate,
} = require("../../utils/rateCalculator");
const { calculateFinalOrderRate } = require("../../utils/calculateFinalOrderRate");
const { resolveSlabsForCompany } = require("../../utils/resolveCompanyRateSlabs");
const { resolveRateCompanyID } = require("../../utils/companyScope");

const resolveZone = async ({ zone, destinationPincode }) => {
  if (zone && RATE_ZONES.includes(zone)) {
    return { zone, source: "manual" };
  }

  const pincode = String(destinationPincode || "").trim();
  if (!pincode) {
    return { zone: null, source: null };
  }

  const resolved = await resolvePincodeRateZone({ pincode });
  if (!resolved.zone) {
    return { zone: null, source: null, pincode };
  }

  return {
    zone: resolved.zone,
    source: resolved.source || "pincode",
    pincode,
  };
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
    const companyScope = resolveRateCompanyID(req, companyID);
    if (!companyScope.ok) {
      return res.status(companyScope.status).json({
        success: false,
        message: companyScope.message,
      });
    }
    const normalizedCompanyID = companyScope.companyID;
    const zoneInfo = await resolveZone({ zone, destinationPincode });

    if (!zoneInfo.zone) {
      return res.status(400).json({
        success: false,
        message: zoneInfo.pincode
          ? `Zone not found for pincode ${zoneInfo.pincode}. Select a zone manually.`
          : "Destination zone or pincode is required.",
      });
    }

    const useFinalRate = paymentMethod !== undefined;
    const normalizedInvoiceValue =
      invoiceValue === undefined || invoiceValue === null ||
      String(invoiceValue).trim() === ""
        ? 0
        : Number(invoiceValue);

    const slabResolve = await resolveSlabsForCompany(
      normalizedCompanyID,
      normalizedService,
      { allowGlobalFallback: !normalizedCompanyID }
    );

    if (!slabResolve.slabs?.length) {
      return res.status(400).json({
        success: false,
        message:
          slabResolve.message ||
          `No rate slabs configured for ${normalizedService} service.`,
      });
    }

    const result = useFinalRate
      ? await calculateFinalOrderRate({
          companyID: normalizedCompanyID,
          service: normalizedService,
          weight,
          length,
          breadth,
          height,
          zone: zoneInfo.zone,
          paymentMethod,
          invoiceValue: normalizedInvoiceValue,
          slabs: slabResolve.slabs,
          skipSlabResolve: true,
        })
      : calculateRate({
          service: normalizedService,
          weight,
          length,
          breadth,
          height,
          zone: zoneInfo.zone,
          slabs: slabResolve.slabs,
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
        slabSource: slabResolve.source,
        companyID: normalizedCompanyID || null,
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
