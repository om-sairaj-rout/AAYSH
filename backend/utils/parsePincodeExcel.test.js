const assert = require("assert");
const { normalizePincodeCell, parsePincodeWorkbook } = require("./parsePincodeExcel");
const XLSX = require("xlsx");

assert.strictEqual(normalizePincodeCell(110001), "110001");
assert.strictEqual(normalizePincodeCell("110001"), "110001");
const sheet = XLSX.utils.aoa_to_sheet([["110001"], ["110002"], ["bad"], [""]]);
const buf = XLSX.write(
  { SheetNames: ["p"], Sheets: { p: sheet } },
  { type: "buffer", bookType: "xlsx" }
);
const parsed = parsePincodeWorkbook(buf);
assert.strictEqual(parsed.error, null);
assert.deepStrictEqual(parsed.pincodes, ["110001", "110002"]);
assert.strictEqual(parsed.invalid.length, 1);

console.log("parsePincodeExcel.test.js: all assertions passed");
