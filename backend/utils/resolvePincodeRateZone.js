const PincodeZoneMapping = require("../models/pincodeZoneMapping.model");
const { RATE_ZONES, REST_OF_INDIA_ZONE } = require("../constants/rateZones");

const MAPPING_NOT_FOUND = "Pincode zone mapping not found.";

/**
 * Destination rate zone: explicit pincode mapping, else Rest of India.
 */
const resolvePincodeRateZone = async ({
  pincode,
  PincodeZoneMappingModel = PincodeZoneMapping,
}) => {
  const normalizedPincode = String(pincode || "").trim();

  if (!normalizedPincode) {
    return {
      zone: null,
      source: null,
      pincode: null,
      message: "Destination pincode is required to resolve rate zone.",
    };
  }

  const mapped = await PincodeZoneMappingModel.findOne({
    pincode: normalizedPincode,
  }).lean();

  if (mapped?.zone && RATE_ZONES.includes(mapped.zone)) {
    return {
      zone: mapped.zone,
      source: "pincodeZoneMapping",
      pincode: normalizedPincode,
    };
  }

  return {
    zone: REST_OF_INDIA_ZONE,
    source: "default",
    pincode: normalizedPincode,
  };
};

module.exports = { resolvePincodeRateZone, MAPPING_NOT_FOUND };
