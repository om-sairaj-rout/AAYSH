export const WALLET_RECHARGE_MIN_INR = 500;
export const WALLET_RECHARGE_STEP_INR = 500;

export const validateRechargeAmount = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return {
      ok: false,
      message: "Enter a valid recharge amount.",
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
      message: `Amount must be in multiples of ₹${WALLET_RECHARGE_STEP_INR} (e.g. ₹500, ₹1,000, ₹1,500). Amounts like ₹600 or ₹800 are not allowed.`,
    };
  }
  return { ok: true, amount: value };
};
