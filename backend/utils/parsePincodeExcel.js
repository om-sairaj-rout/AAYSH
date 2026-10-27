const XLSX = require("xlsx");

const INDIAN_PINCODE_REGEX = /^\d{6}$/;

const normalizePincodeCell = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    if (asInt >= 0 && asInt <= 999999) {
      return String(asInt).padStart(6, "0");
    }
    return null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const digitsOnly = raw.replace(/\s/g, "");
  if (/^\d{6}$/.test(digitsOnly)) return digitsOnly;
  if (/^\d{1,6}$/.test(digitsOnly)) return digitsOnly.padStart(6, "0");
  return null;
};

/**
 * Parse headerless pincode workbook. Returns column analysis + pincode list.
 */
const parsePincodeWorkbook = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const columnCounts = [];
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

  for (let c = 0; c < maxCols; c += 1) {
    let populated = 0;
    let validPincodes = 0;
    for (const row of rows) {
      const cell = row[c];
      if (cell === undefined || cell === null || String(cell).trim() === "") {
        continue;
      }
      populated += 1;
      if (normalizePincodeCell(cell)) validPincodes += 1;
    }
    if (populated > 0) {
      columnCounts.push({ columnIndex: c, populated, validPincodes });
    }
  }

  if (columnCounts.length === 0) {
    return {
      error: "No data found in the spreadsheet.",
      pincodes: [],
      invalid: [],
      duplicatesInFile: [],
      columnCounts,
    };
  }

  const pincodeColumns = columnCounts.filter(
    (col) => col.validPincodes > 0 && col.validPincodes >= col.populated * 0.5
  );

  if (pincodeColumns.length === 0) {
    return {
      error: "No valid 6-digit pincodes detected in the file.",
      pincodes: [],
      invalid: [],
      duplicatesInFile: [],
      columnCounts,
    };
  }

  if (pincodeColumns.length > 1) {
    return {
      error:
        "Multiple columns contain pincode-like values. Upload a file with a single pincode column, or specify pincodeColumnIndex.",
      pincodes: [],
      invalid: [],
      duplicatesInFile: [],
      columnCounts,
      pincodeColumns,
      needsColumnSelection: true,
    };
  }

  const columnIndex = pincodeColumns[0].columnIndex;
  const seen = new Set();
  const duplicatesInFile = [];
  const pincodes = [];
  const invalid = [];

  for (const row of rows) {
    const cell = row[columnIndex];
    if (cell === undefined || cell === null || String(cell).trim() === "") {
      continue;
    }
    const normalized = normalizePincodeCell(cell);
    if (!normalized || !INDIAN_PINCODE_REGEX.test(normalized)) {
      invalid.push(String(cell).trim());
      continue;
    }
    if (seen.has(normalized)) {
      duplicatesInFile.push(normalized);
      continue;
    }
    seen.add(normalized);
    pincodes.push(normalized);
  }

  return {
    error: null,
    pincodes,
    invalid,
    duplicatesInFile,
    columnCounts,
    columnIndex,
  };
};

const parsePincodeWorkbookColumn = (buffer, columnIndex) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const seen = new Set();
  const duplicatesInFile = [];
  const pincodes = [];
  const invalid = [];

  for (const row of rows) {
    const cell = row[columnIndex];
    if (cell === undefined || cell === null || String(cell).trim() === "") {
      continue;
    }
    const normalized = normalizePincodeCell(cell);
    if (!normalized || !INDIAN_PINCODE_REGEX.test(normalized)) {
      invalid.push(String(cell).trim());
      continue;
    }
    if (seen.has(normalized)) {
      duplicatesInFile.push(normalized);
      continue;
    }
    seen.add(normalized);
    pincodes.push(normalized);
  }

  return { pincodes, invalid, duplicatesInFile };
};

module.exports = {
  INDIAN_PINCODE_REGEX,
  normalizePincodeCell,
  parsePincodeWorkbook,
  parsePincodeWorkbookColumn,
};
