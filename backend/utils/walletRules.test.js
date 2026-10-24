const assert = require("assert");
const { validateRechargeAmount } = require("./walletRechargeValidation");
const { WALLET_NEGATIVE_FLOOR, round2 } = require("./walletService");

const assertDebitProjection = (balance, debit) => {
  const projected = round2(balance - debit);
  return projected >= WALLET_NEGATIVE_FLOOR;
};

// --- Recharge validation ---
assert.strictEqual(validateRechargeAmount(499).ok, false);
assert.strictEqual(validateRechargeAmount(500).ok, true);
assert.strictEqual(validateRechargeAmount(1000).ok, true);
assert.strictEqual(validateRechargeAmount(1500).ok, true);
assert.strictEqual(validateRechargeAmount(600).ok, false);
assert.strictEqual(validateRechargeAmount(800).ok, false);
assert.strictEqual(validateRechargeAmount(500.01).ok, false);

// --- Negative floor (example from requirements) ---
assert.strictEqual(assertDebitProjection(200, 100), true); // after ship: 100 left
assert.strictEqual(assertDebitProjection(100, 120), true); // -20 allowed
assert.strictEqual(round2(100 - 120), -20);

// Would exceed -500 floor
assert.strictEqual(assertDebitProjection(100, 601), false);
assert.strictEqual(assertDebitProjection(-400, 150), false);

console.log("walletRules.test.js: all assertions passed");
