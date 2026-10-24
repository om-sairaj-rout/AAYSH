const assert = require("assert");
const { getAwbCategory } = require("./codToPay");
const {
  AWB_CATEGORY_ABOVE1KG,
  AWB_CATEGORY_COD,
  AWB_CATEGORY_PRIME,
  AWB_CATEGORY_UNDER1KG_NORTH_NCR,
  AWB_CATEGORY_UNDER1KG_OTHER,
} = require("../constants/awbCategories");

const northNcr = "Local NCR";
const otherZone = "Metro";

// COD regardless of weight / zone
assert.strictEqual(
  getAwbCategory(5, "surface", "COD", otherZone),
  AWB_CATEGORY_COD
);
assert.strictEqual(
  getAwbCategory(0.5, "prime", "COD", northNcr),
  AWB_CATEGORY_COD
);

// Prime prepaid
assert.strictEqual(
  getAwbCategory(0.5, "prime", "Prepaid", otherZone),
  AWB_CATEGORY_PRIME
);

// Weight boundaries
assert.strictEqual(
  getAwbCategory(1, "surface", "Prepaid", northNcr),
  AWB_CATEGORY_ABOVE1KG
);
assert.strictEqual(
  getAwbCategory(0.999, "air", "Prepaid", northNcr),
  AWB_CATEGORY_UNDER1KG_NORTH_NCR
);
assert.strictEqual(
  getAwbCategory(0.5, "surface", "Prepaid", "North Zone"),
  AWB_CATEGORY_UNDER1KG_NORTH_NCR
);
assert.strictEqual(
  getAwbCategory(0.5, "surface", "Prepaid", otherZone),
  AWB_CATEGORY_UNDER1KG_OTHER
);
assert.strictEqual(
  getAwbCategory(2.5, "air", "Prepaid", northNcr),
  AWB_CATEGORY_ABOVE1KG
);

console.log("awbCategory.test.js: all assertions passed");
