export const isTenDigitPhone = (value) => /^\d{10}$/.test(String(value || "").replace(/\D/g, ""));

export const normalizeTenDigitPhone = (value) =>
  String(value || "").replace(/\D/g, "").slice(0, 10);

export const getPhoneValidationMessage = (value, label = "Phone number") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return `${label} is required`;
  if (!/^\d{10}$/.test(digits)) return `${label} must be exactly 10 digits`;
  return "";
};
