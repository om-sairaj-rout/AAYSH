const assert = require("assert");
const {
  buildDelhiveryPackagesFromOrder,
  parseBoxCount,
} = require("./delhiveryOrderShipmentPlan");

assert.strictEqual(parseBoxCount({ noOfBoxes: 1 }), 1);
assert.strictEqual(parseBoxCount({ noOfBoxes: 3 }), 3);

const sps = buildDelhiveryPackagesFromOrder({
  noOfBoxes: 1,
  weight: 2,
  invoiceValue: 500,
});
assert.strictEqual(sps.shipmentType, "SPS");
assert.strictEqual(sps.packages, null);

const mps = buildDelhiveryPackagesFromOrder({
  noOfBoxes: 3,
  chargeableWeight: 9,
  length: 10,
  breadth: 20,
  height: 30,
  invoiceValue: 900,
});
assert.strictEqual(mps.shipmentType, "MPS");
assert.strictEqual(mps.packages.length, 3);
assert.strictEqual(mps.packages[0].weight, 3);

console.log("delhiveryOrderShipmentPlan.test.js: all assertions passed");