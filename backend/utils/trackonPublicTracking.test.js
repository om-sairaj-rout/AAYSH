const assert = require("assert");
const {
  buildTrackingRowsFromTrackonEvents,
  statusForTrackonEvent,
} = require("./trackonPublicTracking");
const { parseTrackonTrackingPayload } = require("../services/trackon/trackonTrackParse");

const sample = parseTrackonTrackingPayload({
  summaryTrack: null,
  CustomersummaryTrack: {
    AWBNO: "100475098683",
    TRACKING_CODE: "DDUB",
    CURRENT_STATUS: "DELIVERED",
    CURRENT_CITY: "NOIDA",
    EVENTDATE: "22/11/2026",
    EVENTTIME: "14:00",
  },
  lstDetails: [
    {
      TRACKING_CODE: "FMDT",
      CURRENT_STATUS: "S/MENT PICKED UP",
      CURRENT_CITY: "MUMBAI",
      EVENTDATE: "14/11/2026",
      EVENTTIME: "10:00",
    },
    {
      TRACKING_CODE: "DDUB",
      CURRENT_STATUS: "DELIVERED",
      CURRENT_CITY: "NOIDA",
      EVENTDATE: "22/11/2026",
      EVENTTIME: "14:00",
    },
  ],
});

const rows = buildTrackingRowsFromTrackonEvents(sample.events);
assert.strictEqual(rows.length, 2);
assert.strictEqual(rows[0].status, "Shipped");
assert.strictEqual(rows[1].status, "Delivered");
assert.strictEqual(rows[1].location, "NOIDA");

assert.strictEqual(statusForTrackonEvent({ trackingCode: "DRSG" }), "Out For Delivery");

console.log("trackonPublicTracking.test.js: all assertions passed");