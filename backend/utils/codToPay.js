const {
  AWB_CATEGORY_ABOVE1KG,
  AWB_CATEGORY_COD,
  AWB_CATEGORY_PRIME,
  AWB_CATEGORY_UNDER1KG_NORTH_NCR,
  AWB_CATEGORY_UNDER1KG_OTHER,
  isNorthOrNcrZone,
} = require("../constants/awbCategories");

const COD_TO_PAY_CATEGORY = AWB_CATEGORY_COD;

const normalizePaymentMethod = (value) => {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (["COD", "CASH ON DELIVERY"].includes(raw)) return "COD";
  if (["PREPAID", "PAID", "PRE PAID", "ONLINE"].includes(raw)) return "Prepaid";
  return raw || "COD";
};

const isCodPayment = (paymentMethod) => {
  const normalized = normalizePaymentMethod(paymentMethod);
  return normalized === "COD";
};

const isCodToPayPayment = isCodPayment;

const getAwbCategory = (weight, service, paymentMethod, destinationZone = "") => {
  if (isCodPayment(paymentMethod)) {
    return COD_TO_PAY_CATEGORY;
  }
  const normalizedService = String(service || "").toLowerCase();
  if (normalizedService === "prime") {
    return AWB_CATEGORY_PRIME;
  }
  const w = Number(weight);
  if (!Number.isFinite(w)) {
    return AWB_CATEGORY_ABOVE1KG;
  }
  if (w >= 1) {
    return AWB_CATEGORY_ABOVE1KG;
  }
  if (isNorthOrNcrZone(destinationZone)) {
    return AWB_CATEGORY_UNDER1KG_NORTH_NCR;
  }
  return AWB_CATEGORY_UNDER1KG_OTHER;
};

module.exports = {
  COD_TO_PAY_CATEGORY,
  normalizePaymentMethod,
  isCodPayment,
  isCodToPayPayment,
  getAwbCategory,
};
