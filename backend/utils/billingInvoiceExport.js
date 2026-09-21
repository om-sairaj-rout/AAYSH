const { buildPdfBuffer } = require("./billingInvoicePdf");
const { buildExcelBuffer } = require("./billingInvoiceExcel");

module.exports = {
  buildPdfBuffer,
  buildExcelBuffer,
};
