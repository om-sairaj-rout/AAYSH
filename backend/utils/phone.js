const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

/** Normalize to last 10 digits when long enough; otherwise return digits found. */
const normalizePhone = (value) => {
  const digits = digitsOnly(value);
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Customer phone is optional. When provided, it must be a 10-digit mobile number.
 */
const validateOptionalPhone = (value, fieldLabel = "Phone number") => {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return { ok: true, value: "" };
  }

  if (!/^\d{10}$/.test(normalized)) {
    return {
      ok: false,
      message: `Invalid ${fieldLabel.toLowerCase()} (expected 10-digit mobile number when provided)`,
    };
  }

  return { ok: true, value: normalized };
};

module.exports = {
  digitsOnly,
  normalizePhone,
  validateOptionalPhone,
};
