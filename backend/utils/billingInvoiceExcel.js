const XLSX = require("xlsx");
const { TABLE_HEADERS, lineToTableRow, formatMoney } = require("./billingInvoiceTable");
const {
  DEFAULT_ISSUER,
  DEFAULT_BANK,
  DEFAULT_FOOTER_TERMS,
  DEFAULT_FOOTER_NOTE,
  DEFAULT_PREPARED_BY,
} = require("./billingInvoiceConstants");
const { resolveStateCode } = require("./indianStateCodes");

const COL_COUNT = TABLE_HEADERS.length;
const RIGHT_COL = Math.ceil(COL_COUNT / 2);

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const parts = String(isoDate).slice(0, 10).split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatBillAmount = (value) => formatMoney(Math.round(Number(value || 0)));

const emptyRow = () => Array(COL_COUNT).fill("");

const dualRow = (left, right) => {
  const row = emptyRow();
  row[0] = left;
  row[RIGHT_COL] = right;
  return row;
};

const buildExcelBuffer = (invoice) => {
  const meta = invoice.invoiceMeta || {};
  const company = {
    ...(invoice.company || {}),
    stateCode: resolveStateCode(invoice.company?.state) || invoice.company?.stateCode || "",
  };
  const issuer = DEFAULT_ISSUER;
  const bank = DEFAULT_BANK;
  const totals = invoice.totals || {};
  const note = DEFAULT_FOOTER_NOTE;

  const periodFrom = meta.billPeriodFrom || "";
  const periodTo = meta.billPeriodTo || "";
  const periodText =
    meta.billPeriod ||
    (periodFrom && periodTo ? `${periodFrom} To ${periodTo}` : periodFrom || periodTo || "");

  const billCityLine = [company.city, company.state, company.zip_code].filter(Boolean).join(" ");

  const rows = [];
  rows.push(["TAX INVOICE", ...emptyRow().slice(1)]);
  rows.push(emptyRow());
  rows.push(dualRow(issuer.name, `Bill To.: ${company.companyName || ""}`));
  rows.push(dualRow(issuer.addressLine1, company.address || ""));
  rows.push(dualRow(issuer.cityPin, billCityLine));
  rows.push(dualRow(`TEL: ${issuer.phone}`, periodText ? `Invoice Period: ${periodText}` : ""));
  rows.push(
    dualRow(
      `E-mail: ${issuer.email}`,
      `Invoice No.: ${meta.invoiceNumber || ""}`
    )
  );
  rows.push(
    dualRow(
      `GST No.: ${issuer.gstin}`,
      `Invoice Date: ${formatDisplayDate(meta.invoiceDate)}`
    )
  );
  const stateRow = emptyRow();
  stateRow[0] = `STATE: ${issuer.state}`;
  stateRow[1] = `STATE Code: ${issuer.stateCode}`;
  stateRow[RIGHT_COL] = `STATE: ${company.state || ""}`;
  stateRow[RIGHT_COL + 1] = `STATE Code: ${company.stateCode || ""}`;
  rows.push(stateRow);
  rows.push(emptyRow());

  rows.push([...TABLE_HEADERS]);
  (invoice.lines || []).forEach((line, index) => {
    rows.push(lineToTableRow(line, index));
  });
  rows.push(emptyRow());

  rows.push([`Count: ${totals.lineCount || invoice.lines?.length || 0}`, ...emptyRow().slice(1)]);

  const summaryLabelCol = COL_COUNT - 3;
  const summaryValueCol = COL_COUNT - 1;
  const summaryRow = (label, value) => {
    const row = emptyRow();
    row[summaryLabelCol] = label;
    row[summaryValueCol] = value;
    return row;
  };

  rows.push(summaryRow("Amount:", formatMoney(totals.freightSubtotal)));
  rows.push(
    summaryRow(
      `Fuel Surcharge@ ${Number(totals.fuelSurchargePercent || 0)} %`,
      formatMoney(totals.fuelSurcharge)
    )
  );
  if (totals.cgstPercent) {
    rows.push(
      summaryRow(`CGST@ ${Number(totals.cgstPercent)} %`, formatMoney(totals.cgstAmount))
    );
  }
  if (totals.sgstPercent) {
    rows.push(
      summaryRow(`SGST@ ${Number(totals.sgstPercent)} %`, formatMoney(totals.sgstAmount))
    );
  }

  const wordsRow = emptyRow();
  wordsRow[0] = `Amount in Words: ${totals.amountInWords || ""}`;
  wordsRow[summaryLabelCol] = "Bill Amount:";
  wordsRow[summaryValueCol] = formatBillAmount(totals.billAmount);
  rows.push(wordsRow);
  rows.push(emptyRow());

  rows.push([`Bank Details: ${bank.bankName || ""}`, ...emptyRow().slice(1)]);
  if (bank.accountName) rows.push([`A/C Name : ${bank.accountName}`, ...emptyRow().slice(1)]);
  if (bank.accountNo) rows.push([`A/C No : ${bank.accountNo}`, ...emptyRow().slice(1)]);
  if (bank.ifsc) rows.push([`IFSC : ${bank.ifsc}`, ...emptyRow().slice(1)]);
  rows.push(emptyRow());
  rows.push(dualRow("E.&O. E", `For M/S ${issuer.name}`));
  DEFAULT_FOOTER_TERMS.forEach((term, index) => {
    rows.push([`${index + 1}. ${term}`, ...emptyRow().slice(1)]);
  });
  rows.push(emptyRow());
  rows.push([`Note: - ${note}`, ...emptyRow().slice(1)]);
  rows.push(dualRow(`PREPARED BY: - ${DEFAULT_PREPARED_BY}`, "(Auth. Signatory)"));

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [5, 14, 8, 14, 6, 5, 8, 8, 8, 9, 10].map((wch) => ({ wch }));
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: COL_COUNT - 1 } }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

module.exports = { buildExcelBuffer };
