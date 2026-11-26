const XLSX = require("xlsx");

const TEMPLATE_HEADERS = [
  "SR NO",
  "DATE",
  "COMPANY NAME",
  "COURIER PARTNER",
  "AWB NO",
  "DESTINATION",
  "NO OF PIECES",
  "MODE",
  "ACTUAL WEIGHT",
  "INVOICE VALUE",
  "PREPAID/COD",
  "ODA AMOUNT",
  "REMARKS",
];

const TEMPLATE_SAMPLE_ROW = [
  1,
  "01/04/2026",
  "Sample Client Pvt Ltd",
  "Delhivery",
  "123456789012",
  "Mumbai",
  1,
  "Surface",
  1.5,
  1500,
  "Prepaid",
  0,
  "Sample shipment row",
];

const buildBillingInvoiceUploadTemplateBuffer = () => {
  const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE_ROW]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Invoice Upload");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

module.exports = {
  TEMPLATE_HEADERS,
  TEMPLATE_SAMPLE_ROW,
  buildBillingInvoiceUploadTemplateBuffer,
};