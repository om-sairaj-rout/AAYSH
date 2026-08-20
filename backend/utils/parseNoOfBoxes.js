const parseNoOfBoxes = (value, { defaultValue = 1 } = {}) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("no_of_boxes must be a valid positive number.");
  }

  return number;
};

module.exports = { parseNoOfBoxes };
