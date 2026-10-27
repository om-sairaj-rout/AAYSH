const assert = require("assert");
const { resolvePincodeRateZone } = require("./resolvePincodeRateZone");

const mockModel = {
  findOne: ({ pincode }) => ({
    lean: async () => {
      if (pincode === "110001") {
        return { pincode: "110001", zone: "Local NCR" };
      }
      return null;
    },
  }),
};

(async () => {
  const hit = await resolvePincodeRateZone({
    pincode: "110001",
    PincodeZoneMappingModel: mockModel,
  });
  assert.strictEqual(hit.zone, "Local NCR");
  assert.strictEqual(hit.source, "pincodeZoneMapping");

  const miss = await resolvePincodeRateZone({
    pincode: "999999",
    PincodeZoneMappingModel: mockModel,
  });
  assert.strictEqual(miss.zone, "Rest of India");
  assert.strictEqual(miss.source, "default");

  console.log("resolvePincodeRateZone.test.js: all assertions passed");
})();
