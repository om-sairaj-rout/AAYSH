/**
 * Maps MongoDB duplicate key (E11000) errors to user-friendly messages.
 * Never expose raw MongoDB errors to API clients.
 */
const getFriendlyMongoError = (error) => {
  if (!error || error.code !== 11000) {
    return null;
  }

  const keyPattern = error.keyPattern || {};
  const keyValue = error.keyValue || {};

  if (keyPattern.companyName) {
    return "Registration not allowed: A company with this name already exists.";
  }

  if (keyPattern.email) {
    return "A user already exists with this email address.";
  }

  if (keyPattern.mobile_number) {
    return "A user already exists with this mobile number.";
  }

  if (keyPattern.companyID) {
    return "Company ID conflict. Please try again.";
  }

  const duplicateField = Object.keys(keyPattern)[0];
  if (duplicateField) {
    const value = keyValue[duplicateField];
    if (duplicateField === "companyName" || String(value || "").length > 0) {
      return "Registration not allowed: A company with this name already exists.";
    }
    return "A record with the same value already exists.";
  }

  return "A record with the same value already exists.";
};

const respondWithError = (res, error, { status = 500, fallback } = {}) => {
  const friendly = getFriendlyMongoError(error);

  if (friendly) {
    return res.status(400).json({
      success: false,
      message: friendly,
    });
  }

  return res.status(status).json({
    success: false,
    message: fallback || "Something went wrong. Please try again.",
  });
};

module.exports = {
  getFriendlyMongoError,
  respondWithError,
};
