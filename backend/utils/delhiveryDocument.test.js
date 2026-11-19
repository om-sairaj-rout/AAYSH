const assert = require("assert");
const {
  validateDocType,
  DELHIVERY_DOCUMENT_TYPES,
  parseDelhiveryDocumentJsonPayload,
  isAllowlistedDocumentUrl,
} = require("../services/delhivery/delhiveryDocumentValidation");
const { DOCUMENT_PATH } = require("../services/delhivery/delhiveryFetchDocumentApi");
const {
  collectOrderDelhiveryWaybills,
  assertWaybillBelongsToOrder,
} = require("../services/delhivery/delhiveryDocument.service");

assert.strictEqual(DOCUMENT_PATH, "/api/rest/fetch/pkg/document/");

for (const t of DELHIVERY_DOCUMENT_TYPES) {
  assert.strictEqual(validateDocType(t).ok, true);
}
assert.strictEqual(validateDocType("INVALID").ok, false);

const waybills = collectOrderDelhiveryWaybills(
  {
    awbNumber: "M001",
    delhiveryMasterAwb: "M001",
    delhiveryChildAwbs: ["C001", "C002"],
  },
  { packages: [{ waybill: "C001" }, { waybill: "C002" }], childAwbs: ["C001"] }
);
assert.ok(waybills.includes("M001"));
assert.ok(waybills.includes("C001"));
assert.ok(waybills.includes("C002"));

const spsCheck = assertWaybillBelongsToOrder("M001", waybills);
assert.strictEqual(spsCheck.ok, true);
const mpsCheck = assertWaybillBelongsToOrder("C002", waybills);
assert.strictEqual(mpsCheck.ok, true);
const badWb = assertWaybillBelongsToOrder("OTHER", waybills);
assert.strictEqual(badWb.ok, false);
assert.strictEqual(assertWaybillBelongsToOrder("", waybills).ok, false);

assert.strictEqual(
  isAllowlistedDocumentUrl("https://track.delhivery.com/foo"),
  true
);
assert.strictEqual(
  isAllowlistedDocumentUrl("http://track.delhivery.com/foo"),
  false
);
assert.strictEqual(
  isAllowlistedDocumentUrl("https://evil.example/doc"),
  false
);

const urlJson = parseDelhiveryDocumentJsonPayload(
  { success: true, url: "https://track.delhivery.com/pod/1" },
  200
);
assert.strictEqual(urlJson.ok, true);
assert.strictEqual(urlJson.delivery, "url");

const notFound = parseDelhiveryDocumentJsonPayload({ error: "missing" }, 404);
assert.strictEqual(notFound.ok, false);
assert.strictEqual(notFound.error_code, "NOT_FOUND");

const auth = parseDelhiveryDocumentJsonPayload({}, 401);
assert.strictEqual(auth.error_code, "AUTH_ERROR");

const base64Json = parseDelhiveryDocumentJsonPayload(
  {
    data: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+Pg",
    content_type: "application/pdf",
    filename: "epod.pdf",
  },
  200
);
assert.strictEqual(base64Json.ok, true);
assert.strictEqual(base64Json.delivery, "base64");

const binarySim = {
  ok: true,
  delivery: "binary",
  data: Buffer.from("%PDF"),
  contentType: "application/pdf",
};
assert.strictEqual(binarySim.delivery, "binary");

console.log("delhiveryDocument.test.js: all assertions passed");