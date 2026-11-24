const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const normalizePhone = (value) => digitsOnly(value);

const validateRequiredPhone = (value, fieldLabel = "Phone number") => {
  const digits = digitsOnly(value);

  if (!digits) {
    return {
      ok: false,
      message: `${fieldLabel} is required`,
    };
  }

  if (!/^\d{10}$/.test(digits)) {
    return {
      ok: false,
      message: `${fieldLabel} must be exactly 10 digits`,
    };
  }

  return { ok: true, value: digits };
};

/**
 * Normalize Indian mobiles for DB lookup (stored as 10 digits).
 * Accepts +91, 91, leading 0, spaces/hyphens; rejects invalid lengths.
 */
const normalizeIndianMobileForLookup = (value) => {
  let digits = digitsOnly(value);
  if (!digits) {
    return { ok: false, message: "Mobile number is required" };
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^\d{10}$/.test(digits)) {
    return {
      ok: false,
      message: "Mobile number must be a valid 10-digit Indian number",
    };
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      ok: false,
      message: "Mobile number must be a valid 10-digit Indian number",
    };
  }

  return { ok: true, value: digits };
};

const isLegacyPhoneStorage = (value) => {
  const digits = digitsOnly(value);
  if (!digits) return false;
  return digits.length !== 10;
};

const validateOptionalPhone = (value, fieldLabel = "Phone number") => {
  const digits = digitsOnly(value);

  if (!digits) {
    return { ok: true, value: "" };
  }

  if (!/^\d{10}$/.test(digits)) {
    return {
      ok: false,
      message: `${fieldLabel} must be exactly 10 digits`,
    };
  }

  return { ok: true, value: digits };
};

module.exports = {
  digitsOnly,
  normalizePhone,
  normalizeIndianMobileForLookup,
  isLegacyPhoneStorage,
  validateRequiredPhone,
  validateOptionalPhone,
};
