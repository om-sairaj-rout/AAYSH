const assert = require("assert");
const {
  validatePodUploadFile,
  getPodAvailability,
} = require("./shipmentPod");

assert.strictEqual(
  validatePodUploadFile({
    buffer: Buffer.from("x"),
    mimetype: "application/pdf",
    originalname: "pod.pdf",
    size: 100,
  }).ok,
  true
);

assert.strictEqual(
  validatePodUploadFile({
    buffer: Buffer.from("x"),
    mimetype: "text/plain",
    originalname: "pod.txt",
    size: 100,
  }).ok,
  false
);

assert.strictEqual(
  getPodAvailability({ shippingStatus: "In Transit" }).podStatus,
  "not_delivered"
);

assert.strictEqual(
  getPodAvailability({ shippingStatus: "Delivered" }).podStatus,
  "not_uploaded"
);
assert.strictEqual(
  getPodAvailability({ shippingStatus: "Delivered" }).message,
  "POD not uploaded yet."
);

assert.strictEqual(
  getPodAvailability({
    shippingStatus: "Delivered",
    podDocument: { s3Key: "local:pod/x.pdf" },
  }).podStatus,
  "available"
);

console.log("shipmentPod.test.js: all assertions passed");
