const PincodeZoneMapping = require("../../models/pincodeZoneMapping.model");
const { PINCODE_MANAGED_ZONES } = require("../../constants/rateZones");
const {
  buildImportPreview,
  applyPincodeZoneImport,
} = require("../../utils/pincodeZoneImport");

const getZoneSummary = async (req, res) => {
  try {
    const rows = await PincodeZoneMapping.aggregate([
      { $group: { _id: "$zone", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const countsByZone = PINCODE_MANAGED_ZONES.reduce((acc, zone) => {
      acc[zone] = 0;
      return acc;
    }, {});

    for (const row of rows) {
      if (PINCODE_MANAGED_ZONES.includes(row._id)) {
        countsByZone[row._id] = row.count;
      }
    }

    return res.json({
      success: true,
      zones: PINCODE_MANAGED_ZONES,
      countsByZone,
      totalMapped: rows.reduce((sum, row) => sum + row.count, 0),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const previewPincodeZoneImport = async (req, res) => {
  try {
    const zone = String(req.body.zone || "").trim();
    const columnIndex = req.body.pincodeColumnIndex;

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Excel file is required." });
    }

    const result = await buildImportPreview({
      buffer: req.file.buffer,
      zone,
      columnIndex,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const importPincodeZone = async (req, res) => {
  try {
    const zone = String(req.body.zone || "").trim();
    const columnIndex = req.body.pincodeColumnIndex;
    const confirm =
      req.body.confirm === true || req.body.confirm === "true";

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: "Set confirm=true after reviewing the preview.",
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Excel file is required." });
    }

    const result = await applyPincodeZoneImport({
      buffer: req.file.buffer,
      zone,
      columnIndex,
      userId: req.user?.id,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getZoneSummary,
  previewPincodeZoneImport,
  importPincodeZone,
};
