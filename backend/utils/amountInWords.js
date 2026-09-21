const BELOW_TWENTY = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const TENS = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

const twoDigits = (num) => {
  if (num < 20) return BELOW_TWENTY[num];
  const ten = Math.floor(num / 10);
  const unit = num % 10;
  return unit ? `${TENS[ten]} ${BELOW_TWENTY[unit]}` : TENS[ten];
};

const threeDigits = (num) => {
  if (num < 100) return twoDigits(num);
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  return `${BELOW_TWENTY[hundred]} HUNDRED${rest ? ` ${twoDigits(rest)}` : ""}`;
};

const amountInWords = (amount) => {
  const value = Math.round(Number(amount || 0));
  if (!Number.isFinite(value) || value < 0) return "";
  if (value === 0) return "ZERO ONLY";

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const hundredPart = value % 1000;

  const parts = [];
  if (crore) parts.push(`${twoDigits(crore)} CRORE`);
  if (lakh) parts.push(`${twoDigits(lakh)} LAKH`);
  if (thousand) parts.push(`${twoDigits(thousand)} THOUSAND`);
  if (hundredPart) parts.push(threeDigits(hundredPart));

  return `${parts.join(" ").trim()} ONLY`;
};

module.exports = { amountInWords };
