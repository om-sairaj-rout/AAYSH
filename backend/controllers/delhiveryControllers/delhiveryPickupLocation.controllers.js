const DelhiveryPickupLocation = require("../../models/delhiveryPickupLocation.model");

/** Delhivery pickup warehouses belong to the logged-in user's company (admin account company). */
const resolveCompanyScope = (req) => {
  const companyID = String(req.user?.companyID || "")
    .trim()
    .toUpperCase();
  return { companyID, scoped: true };
};

const listDelhiveryPickupLocations = async (req, res) => {
  try {
    const { companyID } = resolveCompanyScope(req);
    if (!companyID) {
      return res.status(400).json({
        success: false,
        message: "Company context missing",
      });
    }

    const activeOnly = String(req.query.active_only || "true") === "true";
    const filter = { companyID };
    if (activeOnly) filter.active = true;

    const rows = await DelhiveryPickupLocation.find(filter)
      .sort({ facilityName: 1 })
      .lean();

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list pickup locations",
    });
  }
};

const createDelhiveryPickupLocation = async (req, res) => {
  try {
    const { companyID } = resolveCompanyScope(req);
    const body = req.body || {};

    if (!companyID) {
      return res.status(400).json({
        success: false,
        message: "Company context missing",
      });
    }

    const facilityName = String(body.facilityName || "").trim();
    if (!facilityName) {
      return res.status(400).json({
        success: false,
        message: "facilityName (exact Delhivery warehouse name) is required",
      });
    }

    const doc = await DelhiveryPickupLocation.create({
      companyID,
      facilityName,
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
      state: String(body.state || "").trim(),
      pincode: String(body.pincode || "").trim(),
      active: body.active !== false,
      notes: String(body.notes || "").trim(),
      createdBy: req.user?.id || null,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Pickup location with this facility name already exists.",
      });
    }
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create pickup location",
    });
  }
};

const updateDelhiveryPickupLocation = async (req, res) => {
  try {
    const { companyID, scoped } = resolveCompanyScope(req);
    const { id } = req.params;

    const filter = { _id: id };
    if (scoped) filter.companyID = companyID;

    const patch = {};
    const body = req.body || {};
    if (body.facilityName != null) {
      patch.facilityName = String(body.facilityName).trim();
    }
    if (body.address != null) patch.address = String(body.address).trim();
    if (body.city != null) patch.city = String(body.city).trim();
    if (body.state != null) patch.state = String(body.state).trim();
    if (body.pincode != null) patch.pincode = String(body.pincode).trim();
    if (body.notes != null) patch.notes = String(body.notes).trim();
    if (body.active != null) patch.active = Boolean(body.active);

    const updated = await DelhiveryPickupLocation.findOneAndUpdate(
      filter,
      { $set: patch },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Pickup location not found",
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update pickup location",
    });
  }
};

module.exports = {
  listDelhiveryPickupLocations,
  createDelhiveryPickupLocation,
  updateDelhiveryPickupLocation,
};
