/** Fixed issuer block (not editable in app — matches reference PDF). */
const DEFAULT_ISSUER = {
  name: "AIR EXPRESS COURIER",
  addressLine1: "SECTOR 82 UDYOG VIHAR",
  cityPin: "NOIDA -201304",
  phone: "8882719505",
  email: "airexpresscourierandlogistic@gmail.com",
  gstin: "09NVOPS6587N1ZU",
  state: "UTTAR PRADESH",
  stateCode: "09",
};

/** Fixed bank footer (matches reference PDF). */
const DEFAULT_BANK = {
  bankName: "STATE BANK OF INDIA.",
  accountName: "AIR EXPRESS COURIER",
  accountNo: "44377303500",
  ifsc: "SBIN0010079",
};

const DEFAULT_FOOTER_TERMS = [
  "Please pay by Cheque/ Draft in favour of AIR EXPRESS COURIER",
  "Payment should be made with in 7days from the date of bill.",
  "Late payments are subject to an interest charges of 2% per month.",
  "Payment should be made to authorised officer only against official receipt.",
  "All disputes Subject to Delhi Jurisdiction.",
];

const DEFAULT_FOOTER_NOTE =
  "In Case of any Discrepancy found in the bill please inform to us within 48 hrs from the date of submission of GST. No Correction or Deduction will be accepted after 48 hrs.";

const DEFAULT_PREPARED_BY = "SONAM";

module.exports = {
  DEFAULT_ISSUER,
  DEFAULT_BANK,
  DEFAULT_FOOTER_TERMS,
  DEFAULT_FOOTER_NOTE,
  DEFAULT_PREPARED_BY,
};
