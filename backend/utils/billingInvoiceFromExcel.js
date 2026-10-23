const XLSX = require("xlsx");
const Company = require("../models/company.model");
const PincodeServiceability = require("../models/upload/serviceability.model");
const { RATE_ZONES } = require("../constants/rateZones");
const getCategory = require("./categoryMapper");
const { getCompanyRateProfile } = require("./resolveCompanyRateSlabs");
const {
  calculateFinalOrderRate,
  round2,
} = require("./calculateFinalOrderRate");
const { recalculateInvoiceTotals } = require("./billingInvoiceTotals");
const { resolveStateCode } = require("./indianStateCodes");
const { modeToService } = require("./billingInvoiceRecalculate");
const { normalizeService } = require("./rateCalculator");

const buildCompactInvoiceNumber = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  const seq = String(now.getTime()).slice(-4);
  return `AIR/${fy}/${seq}`;
};

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

const HEADER_ALIASES = {
  // Standard billing upload template
  "SR NO": "sr",
  SR: "sr",
  SNO: "sr",
  "S NO": "sr",
  DATE: "date",
  "BOOKING DATE": "date",
  "COMPANY NAME": "companyName",
  "COURIER PARTNER": "courier",
  "AWB NO": "awb",
  AWB: "awb",
  "AWB NUMBER": "awb",
  DESTINATION: "des",
  DES: "des",
  CITY: "des",
  "NO OF PIECES": "pcs",
  PCS: "pcs",
  BOXES: "pcs",
  "NO OF BOXES": "pcs",
  MOD: "mode",
  WOD: "mode",
  MODE: "mode",
  SERVICE: "mode",
  "ACTUAL WEIGHT": "actualWeight",
  WEIGHT: "actualWeight",
  "CHARGEABLE WEIGHT": "actualWeight",
  VOLUME: "volume",
  "INVOICE VALUE": "invoiceValue",
  "INV VALUE": "invoiceValue",
  VALUE: "invoiceValue",
  ROV: "rovSheet",
  "PREPAID/COD": "payment",
  PREPAID: "payment",
  COD: "payment",
  "PAY TYPE": "payment",
  "PAYMENT METHOD": "payment",
  "PAYMENT TYPE": "payment",
  PAYMENT: "payment",
  "ODA AMOUNT": "oda",
  ODA: "oda",
  REMARKS: "remarks",
  // Legacy / optional
  ZONE: "zone",
  LOCATION: "zone",
  CATEGORY: "zone",
  STATE: "state",
  PINCODE: "pincode",
  PIN: "pincode",
  LENGTH: "length",
  BREADTH: "breadth",
  WIDTH: "breadth",
  HEIGHT: "height",
};

const REQUIRED_HEADER_KEYS = ["awb", "actualWeight", "des"];
const REQUIRED_HEADER_LABELS = {
  awb: "AWB No",
  actualWeight: "Actual Weight",
  des: "Destination",
};

const ZONE_SOURCE_KEYS = ["zone", "des", "pincode"];

const parseNumber = (value, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    return required ? NaN : 0;
  }
  const num = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : NaN;
};

/** VOLUME is often a status (e.g. DONE) rather than kg — ignore non-numeric values. */
const parseOptionalVolumeWeight = (value) => {
  const num = parseNumber(value);
  if (Number.isNaN(num) || num <= 0) return 0;
  return num;
};

const formatCellText = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isInteger(value)) {
      const asText = String(value);
      if (/e/i.test(asText)) {
        return String(Math.round(value));
      }
      return asText;
    }
    if (Math.abs(value) >= 1e9) {
      return String(Math.trunc(value));
    }
    return String(value);
  }
  return String(value).trim();
};

const isLikelyHeaderRepeatRow = (awb, row, columnMap) => {
  const normalized = String(awb || "").replace(/\s/g, "").toLowerCase();
  if (normalized === "awbno" || normalized === "awb") return true;
  const dest =
    columnMap.des !== undefined ? formatCellText(row[columnMap.des]).toLowerCase() : "";
  return dest === "destination";
};

const parseModCell = (raw) => {
  const v = String(raw || "").trim().toUpperCase();
  if (!v) return "";
  if (["SUF", "SUR", "SURFACE", "SURF", "STD", "STANDARD", "ROAD"].includes(v)) {
    return "surface";
  }
  if (["AIR", "AIREXP", "AIR EXP", "AIR EXPRESS"].includes(v)) return "air";
  if (["PRIME", "PREMIUM"].includes(v)) return "prime";
  return raw;
};

const resolveHeaderKey = (cell) => {
  const normalized = normalizeHeader(cell);
  if (!normalized) return null;
  if (HEADER_ALIASES[normalized]) return HEADER_ALIASES[normalized];

  if (normalized.includes("AWB")) return "awb";
  if (normalized.includes("ACTUAL") && normalized.includes("WEIGHT")) return "actualWeight";
  if (normalized.includes("CHARGEABLE") && normalized.includes("WEIGHT")) {
    return "actualWeight";
  }
  if (normalized.includes("VOLUME")) return "volume";
  if (normalized.includes("DESTINATION")) return "des";
  if (normalized === "MOD" || normalized === "MODE" || normalized === "WOD") return "mode";
  if (normalized.includes("INVOICE") && normalized.includes("VALUE")) return "invoiceValue";
  if (normalized.includes("PREPAID") || normalized.includes("PAYMENT")) return "payment";
  if (normalized.includes("ODA")) return "oda";
  if (normalized.includes("PIECES") || normalized === "PCS") return "pcs";
  if (normalized.includes("COURIER")) return "courier";
  if (normalized.includes("REMARK")) return "remarks";
  if (normalized === "DATE") return "date";
  if (normalized.includes("COMPANY") && normalized.includes("NAME")) return "companyName";

  return null;
};

const sheetToMatrix = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
};

const findHeaderRowIndex = (matrix) => {
  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const row = matrix[i] || [];
    const keys = row.map((cell) => resolveHeaderKey(cell)).filter(Boolean);
    const hasAwb = keys.includes("awb");
    const hasWeight = keys.includes("actualWeight");
    const hasDest = keys.includes("des");
    if (hasAwb && (hasWeight || hasDest)) return i;
  }
  return -1;
};

const mapHeaderColumns = (headerRow) => {
  const map = {};
  headerRow.forEach((cell, index) => {
    const key = resolveHeaderKey(cell);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
};

const formatExcelDate = (value) => {
  if (!value) return "";
  if (typeof value === "number" && value > 30000 && value < 60000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const dd = String(parsed.d).padStart(2, "0");
      const mm = String(parsed.m).padStart(2, "0");
      const yy = String(parsed.y).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const dd = String(value.getDate()).padStart(2, "0");
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const yy = String(value.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
  return String(value).trim();
};

const normalizeZoneLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = RATE_ZONES.find((z) => z.toLowerCase() === raw.toLowerCase());
  return match || null;
};

const parsePaymentMethod = (value) => {
  const v = String(value || "COD").trim().toUpperCase();
  if (!v || v === "PREPAID/COD") return "COD";
  if (["PREPAID", "PPD", "PAID", "PREPAY"].includes(v) || v.includes("PREPAID")) {
    return "PREPAID";
  }
  if (["TO PAY", "TOPAY", "TO-PAY"].includes(v) || v.includes("TO PAY")) {
    return "TO PAY";
  }
  if (v === "COD" || v.includes("COD")) return "COD";
  return "COD";
};

const formatServiceCode = (service) => {
  const normalized = normalizeService(service);
  if (normalized === "air" || normalized === "prime") return "AIR";
  return "SUF";
};

const resolveZoneForExcelRow = async ({ zoneText, des, state, pincode }) => {
  const fromZoneCol = normalizeZoneLabel(zoneText);
  if (fromZoneCol) return { zone: fromZoneCol };

  if (zoneText) {
    return {
      error: `Invalid zone "${zoneText}". Use one of: ${RATE_ZONES.join(", ")}`,
    };
  }

  const desAsZone = normalizeZoneLabel(des);
  if (desAsZone) return { zone: desAsZone };

  const pin = String(pincode || "").trim();
  if (pin) {
    const serviceability = await PincodeServiceability.findOne({ pincode: pin }).lean();
    if (serviceability?.zone && RATE_ZONES.includes(serviceability.zone)) {
      return { zone: serviceability.zone, source: "pincode" };
    }
  }

  const city = String(des || "").trim();
  if (city) {
    const cityKey = city.toLowerCase();
    const cityAliases = {
      bengaluru: "bangalore",
      bangalore: "bangalore",
      mumbai: "mumbai",
      bombay: "mumbai",
      chennai: "chennai",
      madras: "chennai",
      kolkata: "kolkata",
      calcutta: "kolkata",
      hubli: "hubli",
      palakkad: "palakkad",
    };
    const mappedCity = cityAliases[cityKey] || city;
    const mappedState =
      cityKey === "gujarat" ? "gujarat" : state || "";
    return {
      zone: getCategory(mappedCity, mappedState),
      source: "categoryMapper",
    };
  }

  return {
    error:
      "Could not resolve rate zone. Add ZONE (rate zone), DES (city), or PINCODE.",
  };
};

const validateHeaderColumns = (columnMap) => {
  const missing = REQUIRED_HEADER_KEYS.filter((key) => columnMap[key] === undefined);
  if (missing.length) {
    return {
      success: false,
      message: `Missing required column(s): ${missing
        .map((k) => REQUIRED_HEADER_LABELS[k])
        .join(", ")}. Expected headers like: Sr. No., Date, AWB No., Destination, Actual Weight, MOD, etc.`,
    };
  }

  const hasZoneSource = ZONE_SOURCE_KEYS.some((key) => columnMap[key] !== undefined);
  if (!hasZoneSource) {
    return {
      success: false,
      message: "Missing Destination column (or ZONE / PINCODE for legacy sheets).",
    };
  }

  return { success: true };
};

const buildFailureMessage = (baseMessage, errors = []) => {
  if (!errors.length) return baseMessage;
  const examples = errors
    .slice(0, 5)
    .map((e) => (e.awb ? `${e.awb}: ${e.message}` : e.message))
    .join(" | ");
  return `${baseMessage} ${examples}`;
};

const resolveChargeableWeight = (actualWeight, volumeWeight) => {
  const actual = Number(actualWeight) || 0;
  const volume = Number.isFinite(volumeWeight) ? Number(volumeWeight) : 0;
  if (volume > 0) {
    return round2(Math.max(actual, volume));
  }
  return round2(actual);
};

const buildLineFromRateResult = ({
  awb,
  rowMeta,
  rateResult,
  preservedOda,
}) => {
  const breakdown = {
    ...rateResult.breakdown,
    fuelSurcharge: 0,
    odaCharge: preservedOda,
    finalRate: rateResult.breakdown.subtotalBeforeFuel + preservedOda,
  };

  return {
    awbNumber: awb,
    bookingDate: rowMeta.bookingDate,
    destination: rowMeta.destination,
    destinationPincode: rowMeta.pincode,
    mode: formatServiceCode(rateResult.service),
    service: rateResult.service,
    zone: rateResult.zone,
    paymentMethod: rowMeta.paymentMethod,
    invoiceValue: rowMeta.invoiceValue,
    chargeableWeight: rateResult.chargeableWeight,
    length: rowMeta.length,
    breadth: rowMeta.breadth,
    height: rowMeta.height,
    pcs: rowMeta.pcs,
    noOfBoxes: rowMeta.pcs,
    amount: round2(breakdown.weightSlabRate),
    docketChg: round2(breakdown.docCharge + breakdown.codCharge),
    docChg: round2(breakdown.docCharge + breakdown.codCharge),
    rovChg: round2(breakdown.rovCharge),
    odaChg: round2(preservedOda),
    courierName: rowMeta.courierName || "",
    remarks: rowMeta.remarks || "",
    breakdown,
    slab: rateResult.slab,
    importedFromExcel: true,
    excelSourced: true,
  };
};

const parseAndCalculateLinesFromMatrix = async ({
  matrix,
  companyID,
  profile,
}) => {
  const headerIndex = findHeaderRowIndex(matrix);
  if (headerIndex < 0) {
    return {
      success: false,
      message:
        "Could not find a header row with AWB No. Required columns include AWB No., Destination, and Actual Weight.",
    };
  }

  const columnMap = mapHeaderColumns(matrix[headerIndex]);
  const headerCheck = validateHeaderColumns(columnMap);
  if (!headerCheck.success) {
    return headerCheck;
  }

  const lines = [];
  const errors = [];
  const rovRequired = Boolean(profile?.rovIncluded);

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const awb = formatCellText(row[columnMap.awb]);
    if (!awb) continue;
    if (isLikelyHeaderRepeatRow(awb, row, columnMap)) continue;

    const actualWeight = parseNumber(row[columnMap.actualWeight], { required: true });
    const volumeWeight =
      columnMap.volume !== undefined
        ? parseOptionalVolumeWeight(row[columnMap.volume])
        : 0;
    const chargeableWeight = resolveChargeableWeight(actualWeight, volumeWeight);
    const modeRaw =
      columnMap.mode !== undefined
        ? parseModCell(row[columnMap.mode])
        : "";
    const pcsRaw = columnMap.pcs !== undefined ? parseNumber(row[columnMap.pcs]) : 1;
    const invoiceValueRaw =
      columnMap.invoiceValue !== undefined
        ? parseNumber(row[columnMap.invoiceValue])
        : NaN;
    const odaRaw =
      columnMap.oda !== undefined ? parseNumber(row[columnMap.oda]) : 0;
    const length =
      columnMap.length !== undefined ? parseNumber(row[columnMap.length]) : 0;
    const breadth =
      columnMap.breadth !== undefined ? parseNumber(row[columnMap.breadth]) : 0;
    const height =
      columnMap.height !== undefined ? parseNumber(row[columnMap.height]) : 0;

    if (Number.isNaN(actualWeight) || actualWeight <= 0) {
      errors.push({
        awb,
        message: `Row ${i + 1}: Actual Weight must be a positive number`,
      });
      continue;
    }
    const pcs = Number.isNaN(pcsRaw) || pcsRaw <= 0 ? 1 : pcsRaw;
    const oda = Number.isNaN(odaRaw) || odaRaw < 0 ? 0 : odaRaw;
    if ([length, breadth, height].some((n) => Number.isNaN(n))) {
      errors.push({ awb, message: `Row ${i + 1}: invalid numeric value in dimensions` });
      continue;
    }

    const zoneText =
      columnMap.zone !== undefined ? String(row[columnMap.zone] ?? "").trim() : "";
    const des =
      columnMap.des !== undefined ? formatCellText(row[columnMap.des]) : "";
    const state =
      columnMap.state !== undefined ? String(row[columnMap.state] ?? "").trim() : "";
    const pincode =
      columnMap.pincode !== undefined ? String(row[columnMap.pincode] ?? "").trim() : "";

    if (!des && !zoneText && !pincode) {
      errors.push({
        awb,
        message: `Row ${i + 1}: Destination is required`,
      });
      continue;
    }

    const zoneResult = await resolveZoneForExcelRow({
      zoneText,
      des,
      state,
      pincode,
    });
    if (zoneResult.error || !zoneResult.zone) {
      errors.push({ awb, message: zoneResult.error || "Unable to resolve zone" });
      continue;
    }

    let invoiceValue = 0;
    if (!Number.isNaN(invoiceValueRaw) && invoiceValueRaw >= 0) {
      invoiceValue = round2(invoiceValueRaw);
    } else if (rovRequired) {
      errors.push({
        awb,
        message: `Row ${i + 1}: Invoice Value must be a valid number when ROV is enabled for this company`,
      });
      continue;
    }

    const service = modeToService(modeRaw || "surface", "surface");
    const paymentMethod = parsePaymentMethod(
      columnMap.payment !== undefined ? row[columnMap.payment] : "COD"
    );

    const rateResult = await calculateFinalOrderRate({
      companyID,
      service,
      weight: chargeableWeight,
      length,
      breadth,
      height,
      zone: zoneResult.zone,
      paymentMethod,
      invoiceValue,
      profile,
      deferFuelSurcharge: true,
    });

    if (!rateResult.success) {
      errors.push({ awb, message: rateResult.message || "Rate calculation failed" });
      continue;
    }

    const preservedOda = round2(oda);
    const destinationLabel = des
      ? des.toUpperCase()
      : zoneResult.zone.toUpperCase();

    const courierName =
      columnMap.courier !== undefined
        ? String(row[columnMap.courier] ?? "").trim()
        : "";
    const remarks =
      columnMap.remarks !== undefined ? String(row[columnMap.remarks] ?? "").trim() : "";

    lines.push(
      buildLineFromRateResult({
        awb,
        rowMeta: {
          bookingDate:
            columnMap.date !== undefined
              ? formatExcelDate(row[columnMap.date])
              : "",
          destination: destinationLabel,
          pincode,
          paymentMethod,
          invoiceValue,
          pcs,
          length,
          breadth,
          height,
          courierName,
          remarks,
        },
        rateResult,
        preservedOda,
      })
    );
  }

  if (!lines.length) {
    const detail =
      errors.length > 0
        ? "Fix the row errors below and re-upload."
        : "No data rows with AWB numbers were found below the header.";
    return {
      success: false,
      message: buildFailureMessage(
        `No billable invoice lines were built. ${detail}`,
        errors
      ),
      errors,
    };
  }

  return { success: true, lines, errors };
};

const buildBillingInvoiceFromExcel = async ({ companyID, fileBuffer }) => {
  const normalizedCompanyID = String(companyID || "").trim().toUpperCase();
  if (!normalizedCompanyID) {
    return { success: false, message: "Company ID is required." };
  }
  if (!fileBuffer || !fileBuffer.length) {
    return { success: false, message: "Excel file is required." };
  }

  const company = await Company.findOne({ companyID: normalizedCompanyID })
    .select("companyID companyName gstin address city state zip_code")
    .lean();

  if (!company) {
    return { success: false, message: "Company not found." };
  }

  let matrix;
  try {
    matrix = sheetToMatrix(fileBuffer);
  } catch {
    return { success: false, message: "Unable to read Excel file." };
  }

  const profile = await getCompanyRateProfile(normalizedCompanyID);

  const parsed = await parseAndCalculateLinesFromMatrix({
    matrix,
    companyID: normalizedCompanyID,
    profile,
  });
  if (!parsed.success) {
    return parsed;
  }

  const companyForInvoice = {
    ...company,
    stateCode: resolveStateCode(company.state),
  };

  const invoiceDraft = recalculateInvoiceTotals({
    company: companyForInvoice,
    profile,
    awbCount: parsed.lines.length + parsed.errors.length,
    lineCount: parsed.lines.length,
    errorCount: parsed.errors.length,
    lines: parsed.lines,
    errors: parsed.errors,
    generationMethod: "excel",
    invoiceMeta: {
      invoiceNumber: buildCompactInvoiceNumber(),
      invoiceDate: new Date().toISOString().slice(0, 10),
      billPeriodFrom: "",
      billPeriodTo: "",
      billPeriod: "",
      remarks: "",
      applyTaxInvoice: true,
      cgstPercent: 9,
      sgstPercent: 9,
      preparedBy: "",
    },
    generatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    ...invoiceDraft,
  };
};

module.exports = {
  buildBillingInvoiceFromExcel,
  parseAndCalculateLinesFromMatrix,
  validateHeaderColumns,
  resolveZoneForExcelRow,
};
