const SHIPMENT_ISSUE_TYPES = [
  "Delay in delivery or return / Delivery instructions (Reattempt, hold, etc.)",
  "Merchant / Seller pickup issues",
  "Shipment not delivered / Need POD / Fake remark",
  "Issue with delivered/returned shipment (damage, missing, wrong, partial, etc.)",
  "Update shipment details",
  "Claims / Finance (disputes, remittance, bank details, etc.)",
];

const OTHER_ISSUE_TYPES = ["Tech Support", "Account"];

const TICKET_ISSUE_TYPES = [...SHIPMENT_ISSUE_TYPES, ...OTHER_ISSUE_TYPES];

const TICKET_ISSUE_GROUPS = [
  { label: "Shipment Issue", options: SHIPMENT_ISSUE_TYPES },
  { label: "Other Issue", options: OTHER_ISSUE_TYPES },
];

const LEGACY_TICKET_CATEGORIES = [
  "Shipment",
  "AWB",
  "Pickup",
  "Billing",
  "Account",
  "Other",
];

const deriveLegacyCategory = (issueTypes = []) => {
  const first = String(issueTypes[0] || "").trim();
  if (!first) return "Other";
  if (OTHER_ISSUE_TYPES.includes(first)) {
    return first === "Account" ? "Account" : "Other";
  }
  if (SHIPMENT_ISSUE_TYPES.includes(first)) return "Shipment";
  if (LEGACY_TICKET_CATEGORIES.includes(first)) return first;
  return "Other";
};

const parseIssueTypesInput = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v || "").trim()).filter(Boolean);
  }
  const text = String(raw || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    }
  } catch {
  }
  return text
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
};

const validateIssueTypes = (issueTypes) => {
  const unique = [...new Set(issueTypes)];
  const invalid = unique.filter((t) => !TICKET_ISSUE_TYPES.includes(t));
  if (!unique.length) {
    return { ok: false, message: "Select at least one issue type" };
  }
  if (invalid.length) {
    return { ok: false, message: "One or more issue types are invalid" };
  }
  return { ok: true, value: unique };
};

module.exports = {
  SHIPMENT_ISSUE_TYPES,
  OTHER_ISSUE_TYPES,
  TICKET_ISSUE_TYPES,
  TICKET_ISSUE_GROUPS,
  LEGACY_TICKET_CATEGORIES,
  deriveLegacyCategory,
  parseIssueTypesInput,
  validateIssueTypes,
};