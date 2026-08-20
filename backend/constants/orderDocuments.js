const ORDER_DOCUMENT_TYPES = [
  "INVOICE",
  "EWAYBILL",
  "DELIVERY_CHALLAN",
  "OTHER",
];

const HIGH_VALUE_INVOICE_THRESHOLD = 50000;

const REQUIRED_HIGH_VALUE_DOCUMENT_TYPES = ["INVOICE", "EWAYBILL"];

const isValidOrderDocumentType = (value) =>
  ORDER_DOCUMENT_TYPES.includes(String(value || "").trim().toUpperCase());

module.exports = {
  ORDER_DOCUMENT_TYPES,
  HIGH_VALUE_INVOICE_THRESHOLD,
  REQUIRED_HIGH_VALUE_DOCUMENT_TYPES,
  isValidOrderDocumentType,
};
