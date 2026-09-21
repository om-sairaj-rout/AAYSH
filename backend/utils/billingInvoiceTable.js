const {
  lineFreightAmount,
  lineRovCharge,
  lineOdaCharge,
  round2,
} = require("./billingInvoiceTotals");

/** Exact column order per reference PDF (Type removed). */
const TABLE_HEADERS = [
  "SR.",
  "AWB",
  "DATE",
  "DES",
  "MODE",
  "PCS",
  "ROV",
  "DOC",
  "ODA",
  "WEIGHT",
  "AMT",
];

const formatMoney = (value) => round2(value).toFixed(2);

const lineDocCharge = (line) =>
  Number(
    line.docChg ??
      line.docketChg ??
      (Number(line.breakdown?.docCharge || 0) + Number(line.breakdown?.codCharge || 0))
  ) || 0;

const lineToTableRow = (line, index) => [
  index + 1,
  line.awbNumber || "",
  line.bookingDate || "",
  line.destination || String(line.destinationCity || "").toUpperCase(),
  line.mode || "",
  Number(line.pcs ?? line.noOfBoxes ?? 1),
  formatMoney(lineRovCharge(line)),
  formatMoney(lineDocCharge(line)),
  formatMoney(lineOdaCharge(line)),
  Number(line.chargeableWeight || 0).toFixed(3),
  formatMoney(lineFreightAmount(line)),
];

module.exports = {
  TABLE_HEADERS,
  lineToTableRow,
  formatMoney,
  lineDocCharge,
};
