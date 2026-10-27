const { RATE_ZONES } = require("../constants/rateZones");
const getCategory = require("./categoryMapper");
const { resolvePincodeRateZone } = require("./resolvePincodeRateZone");
const { calculateRate, normalizeService } = require("./rateCalculator");
const {
  getCompanyRateProfile,
  resolveSlabsForCompany,
} = require("./resolveCompanyRateSlabs");

const COD_CHARGE = 100;
const ROV_PERCENT = 0.3;

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const resolveDocChargeCategory = (service, chargeableWeight) => {
  const normalizedService = normalizeService(service);
  if (normalizedService === "prime") return "prime";
  if (Number(chargeableWeight) < 3) return "below3kg";
  return "above3kg";
};

const resolveDocChargeAmount = (profile, docCategory) => {
  if (docCategory === "prime") {
    return round2(profile.docChargePrime);
  }
  if (docCategory === "below3kg") {
    return round2(profile.docChargeBelow3kg);
  }
  return round2(profile.docChargeAbove3kg);
};

const resolveZoneForOrder = async ({ zone, order, PincodeServiceability }) => {
  const pincode = String(order?.destinationPincode || "").trim();

  if (pincode) {
    const resolved = await resolvePincodeRateZone({ pincode });
    if (resolved.zone) {
      return {
        zone: resolved.zone,
        source: resolved.source,
        pincode: resolved.pincode,
      };
    }
    return {
      zone: null,
      source: null,
      message: resolved.message,
    };
  }

  if (zone && RATE_ZONES.includes(zone)) {
    return { zone, source: "manual" };
  }

  return {
    zone: null,
    source: null,
    message: "Destination pincode or an explicit zone is required.",
  };
};

/**
 * Final rate sequence:
 * Weight Slab → COD → ROV → DOC → Fuel Surcharge → Final
 */
const calculateFinalOrderRate = async ({
  companyID,
  service,
  weight,
  length = 0,
  breadth = 0,
  height = 0,
  zone,
  paymentMethod,
  invoiceValue = 0,
  slabs,
  profile,
  skipSlabResolve = false,
  deferFuelSurcharge = false,
}) => {
  const normalizedService = normalizeService(service);
  let resolvedSlabs = slabs;
  let slabSource = "provided";

  if (!skipSlabResolve && (!resolvedSlabs || !resolvedSlabs.length)) {
    const hasCompany = Boolean(
      String(companyID || "").trim()
    );
    const resolved = await resolveSlabsForCompany(companyID, normalizedService, {
      allowGlobalFallback: !hasCompany,
    });
    resolvedSlabs = resolved.slabs;
    slabSource = resolved.source;
    if (!resolvedSlabs?.length) {
      return {
        success: false,
        message:
          resolved.message ||
          `No rate slabs configured for ${normalizedService} service.`,
      };
    }
  }

  if (!resolvedSlabs?.length) {
    return {
      success: false,
      message: `No rate slabs configured for ${normalizedService} service.`,
    };
  }

  const slabResult = calculateRate({
    service: normalizedService,
    weight,
    length,
    breadth,
    height,
    zone,
    slabs: resolvedSlabs,
  });

  if (!slabResult.success) {
    return slabResult;
  }

  const resolvedProfile =
    profile || (companyID ? await getCompanyRateProfile(companyID) : null);

  const profileData = resolvedProfile || {
    rovIncluded: false,
    docChargeBelow3kg: 0,
    docChargeAbove3kg: 0,
    docChargePrime: 0,
    fuelSurchargePercent: 0,
  };

  const payment = String(paymentMethod || "COD").trim().toUpperCase();
  const isCod = payment === "COD";

  const weightSlabRate = round2(slabResult.rate.total);
  const codCharge = isCod ? COD_CHARGE : 0;
  const invoiceAmount = round2(invoiceValue);
  const rovCharge = profileData.rovIncluded
    ? round2((invoiceAmount * ROV_PERCENT) / 100)
    : 0;

  const docCategory = resolveDocChargeCategory(
    normalizedService,
    slabResult.chargeableWeight
  );
  const docCharge = resolveDocChargeAmount(profileData, docCategory);

  const subtotalBeforeFuel = round2(
    weightSlabRate + codCharge + rovCharge + docCharge
  );
  const fuelPercent = round2(profileData.fuelSurchargePercent);
  const fuelSurcharge = deferFuelSurcharge
    ? 0
    : round2((subtotalBeforeFuel * fuelPercent) / 100);
  const finalRate = round2(subtotalBeforeFuel + fuelSurcharge);

  return {
    success: true,
    service: normalizedService,
    zone: slabResult.zone,
    chargeableWeight: slabResult.chargeableWeight,
    weightInfo: slabResult.weightInfo,
    slab: slabResult.slab,
    slabSource,
    breakdown: {
      weightSlabRate,
      codCharge,
      rovCharge,
      rovIncluded: Boolean(profileData.rovIncluded),
      rovPercent: profileData.rovIncluded ? ROV_PERCENT : 0,
      invoiceValue: invoiceAmount,
      docCharge,
      docCategory,
      subtotalBeforeFuel,
      fuelSurchargePercent: fuelPercent,
      fuelSurcharge,
      finalRate,
    },
    rate: slabResult.rate,
  };
};

module.exports = {
  COD_CHARGE,
  ROV_PERCENT,
  calculateFinalOrderRate,
  resolveDocChargeCategory,
  resolveZoneForOrder,
  round2,
};
