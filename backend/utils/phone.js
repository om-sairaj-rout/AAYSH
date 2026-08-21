const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

/** Normalize to last 10 digits when long enough; otherwise return digits found. */
const normalizePhone = (value) => {
  const digits = digitsOnly(value);
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

/** Customer phone is optional. When provided, store normalized digits without length validation. */
const validateOptionalPhone = (value) => {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return { ok: true, value: "" };
  }

  return { ok: true, value: normalized };
};

module.exports = {
  digitsOnly,
  normalizePhone,
  validateOptionalPhone,
};
