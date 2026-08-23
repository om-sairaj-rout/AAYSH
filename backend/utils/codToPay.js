const COD_TO_PAY_CATEGORY = "codToPay";

const normalizePaymentMethod = (value) => {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (["COD", "CASH ON DELIVERY"].includes(raw)) return "COD";
  if (["TO PAY", "TOPAY", "TO-PAY"].includes(raw)) return "TO PAY";
  if (["PREPAID", "PAID", "PRE PAID", "ONLINE"].includes(raw)) return "Prepaid";
  return raw || "COD";
};

const isCodToPayPayment = (paymentMethod) => {
  const normalized = normalizePaymentMethod(paymentMethod);
  return normalized === "COD" || normalized === "TO PAY";
};

const getAwbCategory = (weight, service, paymentMethod) => {
  if (isCodToPayPayment(paymentMethod)) {
    return COD_TO_PAY_CATEGORY;
  }
  if (String(service || "").toLowerCase() === "prime") {
    return "prime";
  }
  return Number(weight) > 3 ? "over3kg" : "under3kg";
};

module.exports = {
  COD_TO_PAY_CATEGORY,
  normalizePaymentMethod,
  isCodToPayPayment,
  getAwbCategory,
};
