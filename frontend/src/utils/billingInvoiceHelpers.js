import * as XLSX from "xlsx";

export const parseAwbList = (input = "") => {
  const tokens = String(input || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(tokens)];
};

const cellToString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

export const parseAwbsFromUploadFile = async (file) => {
  const name = String(file?.name || "").toLowerCase();
  const isSpreadsheet =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    file.type?.includes("spreadsheet") ||
    file.type === "text/csv";

  if (!isSpreadsheet) {
    const text = await file.text();
    return parseAwbList(text);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const awbs = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const awbKey =
      keys.find((k) => /^awb/i.test(k.trim())) ||
      keys.find((k) => k.trim().toLowerCase() === "awb number") ||
      keys[0];
    const value = cellToString(row[awbKey]);
    if (value) awbs.push(value);
  }

  if (!awbs.length) {
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    for (const row of matrix) {
      for (const cell of row) {
        const value = cellToString(cell);
        if (value) awbs.push(value);
      }
    }
  }

  return [...new Set(awbs)];
};

const round2 = (value) => Number(Number(value || 0).toFixed(2));

/** Empty string while typing clears to null; totals treat null as 0. */
export const parseOptionalNumber = (raw) => {
  const trimmed = String(raw ?? "").trim();
  if (trimmed === "" || trimmed === "-") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

export const numericInputValue = (value) =>
  value === null || value === undefined ? "" : String(value);

const toCalcNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const lineFreightAmount = (line) =>
  toCalcNumber(line.amount ?? line.breakdown?.weightSlabRate);

const lineRovCharge = (line) =>
  line.rovChg === null
    ? 0
    : toCalcNumber(line.rovChg ?? line.breakdown?.rovCharge);

const lineDocCharge = (line) => {
  if (line.docChg === null && line.docketChg === null) return 0;
  return toCalcNumber(
    line.docChg ??
      line.docketChg ??
      (Number(line.breakdown?.docCharge || 0) + Number(line.breakdown?.codCharge || 0))
  );
};

const lineOdaCharge = (line) =>
  line.odaChg === null ? 0 : toCalcNumber(line.odaChg ?? line.breakdown?.odaCharge);

const lineEffectiveTotal = (line) =>
  line.lineTotal === null
    ? lineSubtotalBeforeFuel(line)
    : round2(line.lineTotal ?? lineSubtotalBeforeFuel(line));

export const lineSubtotalBeforeFuel = (line) =>
  round2(
    lineFreightAmount(line) +
      lineDocCharge(line) +
      lineRovCharge(line) +
      lineOdaCharge(line)
  );

/** AMT column: empty while cleared; otherwise show stored or computed line total. */
export const lineAmountInputValue = (line) => {
  if (line.lineTotal === null) return "";
  if (line.lineTotal !== undefined && line.lineTotal !== "") {
    return String(line.lineTotal);
  }
  return String(lineSubtotalBeforeFuel(line));
};

const withLineTotals = (lines) =>
  lines.map((line) => {
    if (line.lineTotal === null) {
      return line;
    }
    return {
      ...line,
      lineTotal: round2(line.lineTotal ?? lineSubtotalBeforeFuel(line)),
    };
  });

export const recalculateInvoiceTotals = (invoice) => {
  const lines = withLineTotals(invoice.lines || []);
  const sums = lines.reduce(
    (acc, line) => {
      acc.freightSubtotal += lineFreightAmount(line);
      acc.docketCharge += lineDocCharge(line);
      acc.rovCharge += lineRovCharge(line);
      acc.odaCharge += lineOdaCharge(line);
      return acc;
    },
    { freightSubtotal: 0, docketCharge: 0, rovCharge: 0, odaCharge: 0 }
  );

  const freightSubtotal = round2(sums.freightSubtotal);
  const docketCharge = round2(sums.docketCharge);
  const rovCharge = round2(sums.rovCharge);
  const odaCharge = round2(sums.odaCharge);
  const subtotalBeforeFuel = round2(freightSubtotal + docketCharge + rovCharge + odaCharge);
  const linesSubtotal = round2(
    lines.reduce((sum, line) => sum + lineEffectiveTotal(line), 0)
  );

  const fuelPercent = round2(
    invoice.profile?.fuelSurchargePercent ??
      invoice.totals?.fuelSurchargePercent ??
      0
  );

  let fuelSurcharge;
  if (invoice.totals?.fuelSurchargeManual) {
    fuelSurcharge = round2(invoice.totals.fuelSurcharge);
  } else {
    fuelSurcharge = round2((subtotalBeforeFuel * fuelPercent) / 100);
  }
  const fuelSurchargeManual = Boolean(invoice.totals?.fuelSurchargeManual);

  const meta = invoice.invoiceMeta || {};
  const cgstPercent = round2(meta.cgstPercent ?? 0);
  const sgstPercent = round2(meta.sgstPercent ?? 0);
  const taxableAmount = round2(subtotalBeforeFuel + fuelSurcharge);
  const cgstAmount = round2((taxableAmount * cgstPercent) / 100);
  const sgstAmount = round2((taxableAmount * sgstPercent) / 100);
  const billAmount = Math.round(taxableAmount + cgstAmount + sgstAmount);

  return {
    ...invoice,
    lines,
    totals: {
      ...(invoice.totals || {}),
      freightSubtotal,
      docketCharge,
      rovCharge,
      odaCharge,
      subtotalBeforeFuel,
      linesSubtotal,
      chargesSubtotal: round2(docketCharge + rovCharge + odaCharge),
      weightSlabRate: freightSubtotal,
      fuelSurchargePercent: fuelPercent,
      fuelSurcharge,
      cgstPercent,
      sgstPercent,
      cgstAmount,
      sgstAmount,
      taxableAmount,
      billAmount,
      finalRate: billAmount,
      lineCount: lines.length,
      fuelSurchargeManual,
    },
  };
};

export const clearAutoFuelOverride = (invoice) => ({
  ...invoice,
  totals: {
    ...(invoice.totals || {}),
    fuelSurchargeManual: false,
  },
});

const freightFromLineTotal = (line, lineTotal) => {
  const doc = lineDocCharge(line);
  const rov = lineRovCharge(line);
  const oda = lineOdaCharge(line);
  return round2(Math.max(0, lineTotal - doc - rov - oda));
};

export const updateInvoiceLine = (invoice, lineIndex, patch) => {
  const lines = [...(invoice.lines || [])];
  const current = lines[lineIndex] || {};
  const nextLine = { ...current, ...patch };

  if (patch.breakdown) {
    nextLine.breakdown = { ...(current.breakdown || {}), ...patch.breakdown };
  }

  lines[lineIndex] = nextLine;
  return recalculateInvoiceTotals(clearAutoFuelOverride({ ...invoice, lines }));
};

export const updateBreakdownField = (invoice, lineIndex, field, rawValue) => {
  const lines = [...(invoice.lines || [])];
  const current = lines[lineIndex] || {};
  const breakdown = { ...(current.breakdown || {}), [field]: Number(rawValue) || 0 };
  const nextLine = { ...current, breakdown };

  if (field === "weightSlabRate") nextLine.amount = breakdown.weightSlabRate;
  if (field === "docCharge" || field === "codCharge") {
    nextLine.docketChg = round2(
      (breakdown.docCharge || 0) + (breakdown.codCharge || 0)
    );
  }
  if (field === "rovCharge") nextLine.rovChg = breakdown.rovCharge;

  lines[lineIndex] = nextLine;
  return recalculateInvoiceTotals({ ...invoice, lines });
};

export const updateLineChargeField = (invoice, lineIndex, field, rawValue) => {
  const lines = [...(invoice.lines || [])];
  const current = lines[lineIndex] || {};

  const value = parseOptionalNumber(rawValue);
  const nextLine = { ...current, [field]: value };

  if (field === "amount") {
    const freight = value === null ? null : value;
    nextLine.amount = freight;
    nextLine.breakdown = {
      ...(current.breakdown || {}),
      weightSlabRate: freight === null ? 0 : freight,
    };
  }
  if (field === "lineTotal") {
    if (value === null) {
      nextLine.lineTotal = null;
      nextLine.amount = null;
      nextLine.breakdown = { ...(current.breakdown || {}), weightSlabRate: 0 };
    } else {
      const freight = freightFromLineTotal(nextLine, value);
      nextLine.amount = freight;
      nextLine.lineTotal = round2(value);
      nextLine.breakdown = {
        ...(current.breakdown || {}),
        weightSlabRate: freight,
      };
    }
  }
  if (field === "docketChg" || field === "docChg") {
    nextLine.docketChg = value;
    nextLine.docChg = value;
    nextLine.breakdown = {
      ...(current.breakdown || {}),
      docCharge: value === null ? 0 : value,
      codCharge: 0,
    };
  }
  if (field === "rovChg") {
    nextLine.breakdown = {
      ...(current.breakdown || {}),
      rovCharge: value === null ? 0 : value,
    };
  }
  if (field === "odaChg") {
    nextLine.breakdown = {
      ...(current.breakdown || {}),
      odaCharge: value === null ? 0 : value,
    };
  }

  if (field !== "lineTotal") {
    nextLine.lineTotal = lineSubtotalBeforeFuel(nextLine);
  }
  lines[lineIndex] = nextLine;
  return recalculateInvoiceTotals(clearAutoFuelOverride({ ...invoice, lines }));
};
