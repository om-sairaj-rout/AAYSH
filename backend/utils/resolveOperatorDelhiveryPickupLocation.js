const DelhiveryPickupLocation = require("../models/delhiveryPickupLocation.model");

const normalizeCompany = (value) =>
  String(value || "").trim().toUpperCase();

/**
 * CMU manifestation needs a registered facility name; resolved server-side (not Select Courier UI).
 * Warehouses are stored under the operator (admin) company account.
 */
const resolveOperatorDelhiveryPickupLocation = async ({
  pickupLocationId,
  operatorCompanyID,
}) => {
  const operatorCompany = normalizeCompany(operatorCompanyID);
  if (!operatorCompany) {
    return {
      ok: false,
      message: "Operator company is required to resolve Delhivery warehouse.",
    };
  }

  if (pickupLocationId) {
    const location = await DelhiveryPickupLocation.findOne({
      _id: pickupLocationId,
      companyID: operatorCompany,
      active: true,
    }).lean();
    if (!location?.facilityName?.trim()) {
      return {
        ok: false,
        message: "Active Delhivery pickup location not found for operator company.",
      };
    }
    return { ok: true, location };
  }

  const location = await DelhiveryPickupLocation.findOne({
    companyID: operatorCompany,
    active: true,
  })
    .sort({ facilityName: 1 })
    .lean();

  if (!location?.facilityName?.trim()) {
    return {
      ok: false,
      message:
        "Configure at least one active Delhivery pickup location under Update → Delhivery Pickup before manifesting COD orders.",
    };
  }

  return { ok: true, location };
};

module.exports = {
  resolveOperatorDelhiveryPickupLocation,
};