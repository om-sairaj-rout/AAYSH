const assert = require("assert");
const {
  TRACKON_CODE_TO_AAYSH,
  mapTrackonCodeToAaysh,
  pickBestForwardTrackonStatusEvent,
  shouldApplyTrackonMappedStatus,
  isReversePickupTrackonCode,
} = require("../services/trackon/trackonStatusMapping");
const {
  parseTrackonEventDateTime,
  parseTrackonTrackingPayload,
  buildTrackonEventSyncKey,
} = require("../services/trackon/trackonTrackParse");
const {
  partitionTrackonEventsForSync,
  isOlderTrackonEvent,
} = require("../services/trackon/trackonTrackingCursors");
const {
  shouldPollTrackonShipping,
  isShippingStatusPastShipped,
  TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES,
  trackonEligibleMongoFilter,
} = require("../services/trackon/trackonTrackingEligibility");
const {
  fetchTrackonAwbTracking,
  isTimeoutError,
} = require("../services/trackon/trackonAwbTrackingApi");
const { isTrackonTrackingEnabled } = require("../config/trackonTrackingConfig");
const {
  claimTrackonTrackingPoll,
  claimShippingsForTrackonPoll,
  trackingClaimTtlMs,
} = require("../services/trackon/trackonTrackingSync.service");

const samplePayload = (overrides = {}) => ({
  summaryTrack: {
    AWBNO: "TRK100",
    CURRENT_STATUS: "In Hub",
    CURRENT_CITY: "Delhi",
    EVENTDATE: "18/11/2025",
    EVENTTIME: "14:30",
    TRACKING_CODE: "MFTD",
    ...overrides.summary,
  },
  lstDetails: overrides.lstDetails || [
    {
      CURRENT_STATUS: "Booked",
      CURRENT_CITY: "Mumbai",
      EVENTDATE: "17/11/2025",
      EVENTTIME: "10:00",
      TRACKING_CODE: "BOKN",
    },
    {
      CURRENT_STATUS: "Shipped",
      CURRENT_CITY: "Mumbai",
      EVENTDATE: "18/11/2025",
      EVENTTIME: "09:00",
      TRACKING_CODE: "PRSS",
    },
    {
      CURRENT_STATUS: "In Transit",
      CURRENT_CITY: "Delhi",
      EVENTDATE: "18/11/2025",
      EVENTTIME: "14:30",
      TRACKING_CODE: "MFTD",
    },
  ],
  ResponseStatus: { ErrorCode: "0", Message: "Success" },
});

const trackonShip = {
  courierName: "Trackon",
  awbNumber: "TRK100",
  shippingStatus: "Shipped",
};

const order = { isReversePickup: false };

for (const [code, expected] of Object.entries(TRACKON_CODE_TO_AAYSH)) {
  const mapped = mapTrackonCodeToAaysh(code);
  assert.strictEqual(
    mapped.aayshStatus,
    expected,
    `map ${code} -> ${expected}`
  );
}

assert.strictEqual(mapTrackonCodeToAaysh("PRSN").skipStatusChange, true);
assert.strictEqual(mapTrackonCodeToAaysh("PRSN").pickupClosureFailed, true);

assert.strictEqual(mapTrackonCodeToAaysh("PRSG").skipStatusChange, true);
assert.strictEqual(mapTrackonCodeToAaysh("PRSG").aayshStatus, null);
assert.strictEqual(mapTrackonCodeToAaysh("PRSG").pickupClosureFailed, undefined);
assert.strictEqual(TRACKON_CODE_TO_AAYSH.PRSG, undefined);

for (const code of ["IMFS", "IMFD", "ISMS", "ISDD", "ISSS"]) {
  assert.strictEqual(
    mapTrackonCodeToAaysh(code).aayshStatus,
    "In Transit",
    `${code} -> In Transit`
  );
  assert.notStrictEqual(TRACKON_CODE_TO_AAYSH[code], "Delayed");
}

for (const code of ["RPRU", "RPRS", "RPSS", "RPSN"]) {
  assert.strictEqual(isReversePickupTrackonCode(code), true);
  assert.strictEqual(mapTrackonCodeToAaysh(code).reversePickupCode, true);
}

assert.strictEqual(mapTrackonCodeToAaysh("XXXX").unknownCode, true);
assert.strictEqual(mapTrackonCodeToAaysh("XXXX").aayshStatus, null);

const ist = parseTrackonEventDateTime("18/11/2025", "14:30");
assert.ok(ist instanceof Date);
assert.strictEqual(parseTrackonEventDateTime("", "12:00"), null);
assert.strictEqual(parseTrackonEventDateTime("bad", "12:00"), null);

const parsed = parseTrackonTrackingPayload(samplePayload());
assert.strictEqual(parsed.ok, true);
assert.strictEqual(parsed.awb, "TRK100");
assert.ok(parsed.events.length >= 3);
assert.strictEqual(parsed.events[0].trackingCode, "BOKN");
assert.strictEqual(
  parsed.events[parsed.events.length - 1].trackingCode,
  "MFTD"
);

const unsorted = parseTrackonTrackingPayload({
  summaryTrack: { AWBNO: "TRK200", TRACKING_CODE: "VFWD", EVENTDATE: "19/11/2025", EVENTTIME: "11:00" },
  lstDetails: [
    { TRACKING_CODE: "PRSS", EVENTDATE: "18/11/2025", EVENTTIME: "08:00" },
    { TRACKING_CODE: "BOKN", EVENTDATE: "17/11/2025", EVENTTIME: "10:00" },
  ],
});
assert.strictEqual(unsorted.events[0].trackingCode, "BOKN");
assert.strictEqual(unsorted.events[unsorted.events.length - 1].trackingCode, "VFWD");

const dupPayload = parseTrackonTrackingPayload({
  summaryTrack: {},
  lstDetails: [
    { TRACKING_CODE: "MFTD", EVENTDATE: "18/11/2025", EVENTTIME: "10:00", CURRENT_CITY: "A" },
    { TRACKING_CODE: "MFTD", EVENTDATE: "18/11/2025", EVENTTIME: "10:00", CURRENT_CITY: "A" },
  ],
});
assert.strictEqual(dupPayload.events.length, 1, "duplicate lstDetails rows deduped");

const empty = parseTrackonTrackingPayload(null);
assert.strictEqual(empty.ok, false);

const errPayload = parseTrackonTrackingPayload({
  summaryTrack: {},
  lstDetails: [],
});
assert.strictEqual(errPayload.ok, true);
assert.strictEqual(errPayload.events.length, 0);

assert.strictEqual(shouldPollTrackonShipping(trackonShip, order), true);
assert.strictEqual(
  shouldPollTrackonShipping({ ...trackonShip, courierName: "TRACKON" }, order),
  true,
  "stored courierName TRACKON must be eligible"
);
assert.strictEqual(
  shouldPollTrackonShipping({ ...trackonShip, courierName: "TRACKON D" }, order),
  true
);
assert.strictEqual(
  shouldPollTrackonShipping({ ...trackonShip, courierName: "Delhivery" }, order),
  false
);
assert.strictEqual(
  shouldPollTrackonShipping({ ...trackonShip, shippingStatus: "Booked" }, order),
  false
);
assert.strictEqual(
  shouldPollTrackonShipping({ ...trackonShip, shippingStatus: "Pending" }, order),
  false
);
assert.strictEqual(
  shouldPollTrackonShipping(trackonShip, { isReversePickup: true }),
  false
);

for (const terminal of [
  "Delivered",
  "RTO",
  "Cancelled",
  "Returned",
  "Exchange",
]) {
  assert.ok(TRACKON_TRACKING_EXCLUDED_SHIPPING_STATUSES.includes(terminal));
  assert.strictEqual(
    shouldPollTrackonShipping({ ...trackonShip, shippingStatus: terminal }, order),
    false
  );
}

assert.strictEqual(isShippingStatusPastShipped({ shippingStatus: "Shipped" }), true);
assert.strictEqual(isShippingStatusPastShipped({ shippingStatus: "Booked" }), false);

const syncKey = buildTrackonEventSyncKey({
  awb: "TRK100",
  trackingCode: "MFTD",
  eventAt: ist,
  currentStatus: "In Transit",
  city: "Delhi",
  remarks: "In Transit",
});

const shippingWithCursor = {
  awbNumber: "TRK100",
  shippingStatus: "In Transit",
  trackonLastSyncedEventAt: new Date("2025-11-18T10:00:00.000Z"),
  trackonLastSyncedEventKey: syncKey,
};

const { newEvents } = partitionTrackonEventsForSync(
  shippingWithCursor,
  parsed.events,
  "TRK100",
  buildTrackonEventSyncKey,
  mapTrackonCodeToAaysh
);
assert.strictEqual(
  newEvents.some((e) => e.trackingCode === "BOKN"),
  false,
  "older events should not re-sync when cursor ahead"
);

const freshShip = { awbNumber: "TRK100" };
const { newEvents: freshNew } = partitionTrackonEventsForSync(
  freshShip,
  parsed.events,
  "TRK100",
  buildTrackonEventSyncKey,
  mapTrackonCodeToAaysh
);
assert.ok(freshNew.length >= 1);

const olderTime = new Date("2025-11-16T10:00:00.000Z");
const newerTime = new Date("2025-11-18T10:00:00.000Z");
assert.strictEqual(
  isOlderTrackonEvent(
    { lastSyncedScanAt: newerTime, lastSyncedScanKey: "k2" },
    olderTime,
    "k1"
  ),
  true
);

assert.strictEqual(shouldApplyTrackonMappedStatus("Delivered", "In Transit"), false);
assert.strictEqual(shouldApplyTrackonMappedStatus("RTO", "Delivered"), false);
assert.strictEqual(shouldApplyTrackonMappedStatus("In Transit", "Shipped"), false);
assert.strictEqual(shouldApplyTrackonMappedStatus("Shipped", "In Transit"), true);
assert.strictEqual(shouldApplyTrackonMappedStatus("Shipped", "Shipped"), true);

assert.strictEqual(mapTrackonCodeToAaysh("DRBG").aayshStatus, "In Transit");
assert.strictEqual(mapTrackonCodeToAaysh("RHOD").aayshStatus, "RTO");

assert.strictEqual(isTimeoutError({ code: "ECONNABORTED" }), true);
assert.strictEqual(isTimeoutError({ message: "timeout of 15000ms exceeded" }), true);
assert.strictEqual(isTimeoutError({ code: "ENOTFOUND" }), false);

assert.ok(trackonEligibleMongoFilter.courierName.$regex);
assert.ok(trackonEligibleMongoFilter.awbNumber.$ne === "");

const statusProgression = ["Shipped", "In Transit", "Out For Delivery", "Delivered"];
const codes = ["PRSS", "MFTD", "DRSG", "DDUB"];
for (let i = 0; i < codes.length; i++) {
  const next = mapTrackonCodeToAaysh(codes[i]).aayshStatus;
  assert.strictEqual(next, statusProgression[i], `${codes[i]} progression`);
  if (i > 0) {
    assert.strictEqual(
      shouldApplyTrackonMappedStatus(statusProgression[i - 1], next),
      true,
      `advance ${statusProgression[i - 1]} -> ${next}`
    );
  }
}
assert.strictEqual(shouldApplyTrackonMappedStatus("Delivered", "In Transit"), false);

const awb100475Cursor = {
  awbNumber: "100475098683",
  shippingStatus: "In Transit",
  trackonLastSyncedEventAt: new Date("2026-11-22T06:36:00.000Z"),
  trackonLastSyncedEventKey:
    "100475098683|ISDE|2026-11-22T06:36:00.000Z|arrived at destination|ndah-noida branch, uttar pradesh|arrived at destination",
};
const backdatedDelivered = parseTrackonTrackingPayload({
  summaryTrack: null,
  CustomersummaryTrack: {
    AWBNO: "100475098683",
    TRACKING_CODE: "DDUB",
    CURRENT_STATUS: "DELIVERED",
    CURRENT_CITY: "NOIDA",
    EVENTDATE: "21/11/2026",
    EVENTTIME: "14:00",
  },
  lstDetails: [
    {
      TRACKING_CODE: "DDUB",
      CURRENT_STATUS: "DELIVERED",
      CURRENT_CITY: "NOIDA",
      EVENTDATE: "21/11/2026",
      EVENTTIME: "14:00",
    },
  ],
});
const { newEvents: awbPartitioned } = partitionTrackonEventsForSync(
  awb100475Cursor,
  backdatedDelivered.events,
  "100475098683",
  buildTrackonEventSyncKey,
  mapTrackonCodeToAaysh
);
assert.strictEqual(
  awbPartitioned.some((e) => e.trackingCode === "DDUB"),
  true,
  "AWB 100475098683: backdated Delivered must not be dropped by cursor"
);
const bestForward = pickBestForwardTrackonStatusEvent(backdatedDelivered.events);
assert.strictEqual(bestForward.mapped.aayshStatus, "Delivered");
assert.strictEqual(bestForward.ev.city, "NOIDA");

assert.strictEqual(
  shouldApplyTrackonMappedStatus("Out For Delivery", "Undelivered"),
  true,
  "NDR Undelivered from OFD"
);
assert.strictEqual(
  shouldApplyTrackonMappedStatus("Undelivered", "Out For Delivery"),
  true,
  "redelivery attempt after Undelivered"
);
assert.strictEqual(
  shouldApplyTrackonMappedStatus("Undelivered", "Delivered"),
  true,
  "Delivered after failed attempt"
);

const rtoVsDelivered = parseTrackonTrackingPayload({
  summaryTrack: null,
  CustomersummaryTrack: {
    AWBNO: "AWB9",
    TRACKING_CODE: "DDUB",
    CURRENT_STATUS: "DELIVERED",
    EVENTDATE: "20/11/2026",
    EVENTTIME: "10:00",
  },
  lstDetails: [
    {
      TRACKING_CODE: "DDUB",
      CURRENT_STATUS: "DELIVERED",
      EVENTDATE: "20/11/2026",
      EVENTTIME: "10:00",
    },
    {
      TRACKING_CODE: "RHOD",
      CURRENT_STATUS: "RTO DELIVERED",
      CURRENT_CITY: "MUMBAI",
      EVENTDATE: "20/11/2026",
      EVENTTIME: "18:00",
    },
  ],
});
const rtoBest = pickBestForwardTrackonStatusEvent(rtoVsDelivered.events);
assert.strictEqual(rtoBest.mapped.aayshStatus, "RTO");
assert.strictEqual(rtoBest.ev.trackingCode, "RHOD");

const stuckPayload = parseTrackonTrackingPayload({
  summaryTrack: null,
  CustomersummaryTrack: {
    AWBNO: "AWB9",
    TRACKING_CODE: "DDUB",
    CURRENT_STATUS: "DELIVERED",
    CURRENT_CITY: "PUNE",
    EVENTDATE: "20/11/2026",
    EVENTTIME: "10:00",
  },
  lstDetails: [
    {
      TRACKING_CODE: "DDUB",
      CURRENT_STATUS: "DELIVERED",
      CURRENT_CITY: "PUNE",
      EVENTDATE: "20/11/2026",
      EVENTTIME: "10:00",
    },
  ],
});
const deliveredKey = buildTrackonEventSyncKey({
  awb: "AWB9",
  trackingCode: "DDUB",
  eventAt: parseTrackonEventDateTime("20/11/2026", "10:00"),
  currentStatus: "DELIVERED",
  city: "PUNE",
  remarks: "DELIVERED",
});
const syncedButWrongStatus = {
  awbNumber: "AWB9",
  shippingStatus: "In Transit",
  trackonLastSyncedEventAt: parseTrackonEventDateTime("20/11/2026", "10:00"),
  trackonLastSyncedEventKey: deliveredKey,
};
const { newEvents: replayBlocked } = partitionTrackonEventsForSync(
  syncedButWrongStatus,
  stuckPayload.events,
  "AWB9",
  buildTrackonEventSyncKey,
  mapTrackonCodeToAaysh
);
assert.strictEqual(replayBlocked.length, 0, "partition skips duplicate keys");
const rescueBest = pickBestForwardTrackonStatusEvent(stuckPayload.events);
assert.strictEqual(rescueBest.mapped.aayshStatus, "Delivered");
assert.strictEqual(
  shouldApplyTrackonMappedStatus(syncedButWrongStatus.shippingStatus, "Delivered"),
  true,
  "best-forward can still advance when partition is empty"
);

assert.strictEqual(typeof claimTrackonTrackingPoll, "function");
assert.strictEqual(typeof claimShippingsForTrackonPoll, "function");
assert.ok(trackingClaimTtlMs() >= 30_000);

/** Real Trackon API shape (PII omitted). */
const customerSummaryOnlyFixture = {
  summaryTrack: null,
  CustomersummaryTrack: {
    AWBNO: "702000123456",
    REF_NO: "REF-1001",
    BOOKING_DATE: "14/11/2025",
    ORIGIN: "MUMBAI",
    PINCODE: "400001",
    DESTINATION: "DELHI",
    PRODUCT: "DOC",
    SERVICE_TYPE: "STANDARD",
    CURRENT_STATUS: "SHIPMENT IN TRANSIT",
    CURRENT_CITY: "MUMBAI HUB",
    EVENTDATE: "17/11/2025",
    EVENTTIME: "18:30",
    TRACKING_CODE: "MFTD",
    NDR_REASON: "",
  },
  lstDetails: [
    {
      CURRENT_CITY: "MUMBAI",
      CURRENT_STATUS: "S/MENT PICKED UP",
      EVENTDATE: "14/11/2025",
      EVENTTIME: "15:10",
      TRACKING_CODE: "FMDT",
    },
    {
      CURRENT_CITY: "MUMBAI HUB",
      CURRENT_STATUS: "MANIFESTED",
      EVENTDATE: "17/11/2025",
      EVENTTIME: "18:30",
      TRACKING_CODE: "MFTD",
    },
  ],
  ResponseStatus: { ErrorCode: "0", Message: "Success" },
};

const fromCustomer = parseTrackonTrackingPayload(customerSummaryOnlyFixture);
assert.strictEqual(fromCustomer.ok, true);
assert.strictEqual(fromCustomer.awb, "702000123456");
assert.strictEqual(fromCustomer.summarySource, "CustomersummaryTrack");
assert.ok(fromCustomer.events.length >= 2);

const fmdtEvent = fromCustomer.events.find(
  (e) =>
    e.trackingCode === "FMDT" &&
    e.currentStatus === "S/MENT PICKED UP"
);
assert.ok(fmdtEvent, "FMDT pickup row preserved");
assert.strictEqual(fmdtEvent.city, "MUMBAI");
assert.strictEqual(fmdtEvent.eventDate, "14/11/2025");
assert.strictEqual(fmdtEvent.eventTime, "15:10");
assert.strictEqual(fmdtEvent.remarks, "S/MENT PICKED UP");

const missingSummaryKey = parseTrackonTrackingPayload({
  CustomersummaryTrack: {
    AWBNO: "AWB9",
    TRACKING_CODE: "PRSS",
    EVENTDATE: "01/02/2025",
    EVENTTIME: "09:00",
    CURRENT_STATUS: "Shipped",
  },
  lstDetails: [],
});
assert.strictEqual(missingSummaryKey.awb, "AWB9");
assert.strictEqual(missingSummaryKey.summarySource, "CustomersummaryTrack");

const bothSummaries = parseTrackonTrackingPayload({
  summaryTrack: {
    AWBNO: "PRIMARY_AWB",
    TRACKING_CODE: "VFWD",
    EVENTDATE: "20/11/2025",
    EVENTTIME: "12:00",
    CURRENT_STATUS: "Forward",
  },
  CustomersummaryTrack: {
    AWBNO: "CUSTOMER_AWB",
    TRACKING_CODE: "BOKN",
    EVENTDATE: "19/11/2025",
    EVENTTIME: "08:00",
    CURRENT_STATUS: "Booked",
  },
  lstDetails: [],
});
assert.strictEqual(bothSummaries.awb, "PRIMARY_AWB");
assert.strictEqual(bothSummaries.summarySource, "summaryTrack");
assert.strictEqual(
  bothSummaries.events.some((e) => e.trackingCode === "BOKN"),
  false,
  "CustomersummaryTrack ignored when summaryTrack is valid"
);

assert.strictEqual(mapTrackonCodeToAaysh("FMDT").aayshStatus, "Shipped");
assert.strictEqual(TRACKON_CODE_TO_AAYSH.FMDT, "Shipped");
assert.strictEqual(shouldApplyTrackonMappedStatus("In Transit", "Shipped"), false);
assert.strictEqual(
  shouldApplyTrackonMappedStatus("Out For Delivery", "Shipped"),
  false
);

const prevEnabled = process.env.TRACKON_TRACKING_ENABLED;
process.env.TRACKON_TRACKING_ENABLED = "false";
assert.strictEqual(isTrackonTrackingEnabled(), false);
process.env.TRACKON_TRACKING_ENABLED = prevEnabled;

(async () => {
  const invalid = await fetchTrackonAwbTracking("");
  assert.strictEqual(invalid.error_code, "INVALID_AWB");

  const unconfigured = await fetchTrackonAwbTracking("AWB1");
  assert.strictEqual(unconfigured.ok, false);
  assert.strictEqual(unconfigured.error_code, "TRACKON_NOT_CONFIGURED");

  console.log("trackonTracking.test.js: all assertions passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});