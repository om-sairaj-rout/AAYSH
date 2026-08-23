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
  validateRequiredPhone,
  validateOptionalPhone,
};
