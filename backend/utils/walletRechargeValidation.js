const round2 = (value) => Number(Number(value || 0).toFixed(2));

const WALLET_RECHARGE_MIN_INR = 500;
const WALLET_RECHARGE_STEP_INR = 500;

const validateRechargeAmount = (amount) => {
  const value = round2(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return {
      ok: false,
      message: "Recharge amount must be a positive number.",
    };
  }
  if (value < WALLET_RECHARGE_MIN_INR) {
    return {
      ok: false,
      message: `Minimum recharge amount is ₹${WALLET_RECHARGE_MIN_INR}.`,
    };
  }
  const paise = Math.round(value * 100);
  const stepPaise = WALLET_RECHARGE_STEP_INR * 100;
  if (paise % stepPaise !== 0) {
    return {
      ok: false,
      message: `Recharge amount must be in multiples of ₹${WALLET_RECHARGE_STEP_INR} (e.g. ₹500, ₹1,000, ₹1,500).`,
    };
  }
  return { ok: true, amount: value };
};

module.exports = {
  WALLET_RECHARGE_MIN_INR,
  WALLET_RECHARGE_STEP_INR,
  validateRechargeAmount,
};
