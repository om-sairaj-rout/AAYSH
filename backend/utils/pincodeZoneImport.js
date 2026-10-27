const PincodeZoneMapping = require("../models/pincodeZoneMapping.model");
const { invalidateDashboardCache } = require("./dashboardCache");
const { PINCODE_MANAGED_ZONES } = require("../constants/rateZones");
const {
  parsePincodeWorkbook,
  parsePincodeWorkbookColumn,
} = require("./parsePincodeExcel");

const classifyPincodes = async (pincodes, zone) => {
  const existing = await PincodeZoneMapping.find({
    pincode: { $in: pincodes },
  })
    .select("pincode zone")
    .lean();

  const existingMap = new Map(existing.map((row) => [row.pincode, row.zone]));

  const added = [];
  const reassigned = [];
  const unchanged = [];

  for (const pincode of pincodes) {
    const currentZone = existingMap.get(pincode);
    if (!currentZone) {
      added.push(pincode);
    } else if (currentZone === zone) {
      unchanged.push(pincode);
    } else {
      reassigned.push({ pincode, fromZone: currentZone, toZone: zone });
    }
  }

  return { added, reassigned, unchanged };
};

const parseWorkbookPincodes = (buffer, columnIndex) => {
  if (columnIndex !== undefined && columnIndex !== null && columnIndex !== "") {
    return {
      ...parsePincodeWorkbookColumn(buffer, Number(columnIndex)),
      error: null,
      columnIndex: Number(columnIndex),
    };
  }
  return parsePincodeWorkbook(buffer);
};

const buildImportPreview = async ({ buffer, zone, columnIndex }) => {
  if (!PINCODE_MANAGED_ZONES.includes(zone)) {
    return {
      success: false,
      message: `Invalid zone. Use: ${PINCODE_MANAGED_ZONES.join(", ")}`,
    };
  }

  const parsed = parseWorkbookPincodes(buffer, columnIndex);

  if (parsed.error) {
    return {
      success: false,
      message: parsed.error,
      preview: parsed,
    };
  }

  const { pincodes, invalid, duplicatesInFile } = parsed;
  const { added, reassigned, unchanged } = await classifyPincodes(pincodes, zone);

  return {
    success: true,
    canImport: true,
    preview: {
      zone,
      columnIndex: parsed.columnIndex,
      totalValid: pincodes.length,
      addedCount: added.length,
      reassignedCount: reassigned.length,
      unchangedCount: unchanged.length,
      invalidCount: invalid.length,
      duplicatesInFileCount: duplicatesInFile.length,
      invalidSample: invalid.slice(0, 20),
      reassignedSample: reassigned.slice(0, 20),
    },
    pincodes,
  };
};

const applyPincodeZoneImport = async ({ buffer, zone, columnIndex, userId }) => {
  const previewResult = await buildImportPreview({ buffer, zone, columnIndex });

  if (!previewResult.success) {
    return previewResult;
  }

  const { pincodes, preview } = previewResult;

  const ops = pincodes.map((pincode) => ({
    updateOne: {
      filter: { pincode },
      update: {
        $set: { zone, updatedBy: userId || null },
      },
      upsert: true,
    },
  }));

  if (ops.length) {
    await PincodeZoneMapping.bulkWrite(ops, { ordered: false });
  }

  const totalInZone = await PincodeZoneMapping.countDocuments({ zone });
  invalidateDashboardCache();

  return {
    success: true,
    message: `Imported ${pincodes.length} pincode(s) for ${zone}.`,
    summary: {
      zone,
      processed: pincodes.length,
      added: preview.addedCount,
      reassigned: preview.reassignedCount,
      unchanged: preview.unchangedCount,
      invalidIgnored: preview.invalidCount,
      duplicatesInFileIgnored: preview.duplicatesInFileCount,
      totalInZone,
    },
    preview,
  };
};

module.exports = {
  buildImportPreview,
  applyPincodeZoneImport,
};
