const mongoose = require("mongoose");
const DelhiveryPickupLocation = require("../models/delhiveryPickupLocation.model");

const validateDelhiveryPickupLocationForCompany = async (
  pickupLocationId,
  companyID
) => {
  const normalizedCompany = String(companyID || "")
    .trim()
    .toUpperCase();

  if (!pickupLocationId || !mongoose.isValidObjectId(pickupLocationId)) {
    return {
      ok: false,
      message: "Invalid Delhivery pickup location.",
    };
  }

  if (!normalizedCompany) {
    return { ok: false, message: "Company context is required." };
  }

  const location = await DelhiveryPickupLocation.findOne({
    _id: pickupLocationId,
    companyID: normalizedCompany,
    active: true,
  }).lean();

  if (!location) {
    return {
      ok: false,
      message:
        "Active Delhivery pickup location not found for this company.",
    };
  }

  return { ok: true, location };
};

module.exports = {
  validateDelhiveryPickupLocationForCompany,
};
