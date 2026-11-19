const assert = require("assert");
const {
  mapDelhiveryStatusPairToAaysh,
  resolveAayshStatusFromSnapshot,
  detectUndeliveredFromSnapshot,
} = require("../services/delhivery/delhiveryStatusMapping");
const {
  buildLatestTrackingSnapshot,
  buildScanSyncKey,
  parseBulkTrackResponse,
} = require("../services/delhivery/delhiveryTrackParse");
const { aggregateMpsPackageStatuses } = require("../services/delhivery/delhiveryMpsStatusAggregate");
const { splitWaybillBatches, MAX_WAYBILLS_PER_TRACK_REQUEST } =
  require("../services/delhivery/delhiveryPackageTrackApi");
const {
  shouldPollDelhiveryShipping,
  isShippingStatusPastShipped,
  isDelhiveryManifestReady,
} = require("../services/delhivery/delhiveryTrackingEligibility");
const {
  isDelhiveryTrackingEligibleStatus,
  isTerminalAayshStatus,
} = require("../services/delhivery/delhiveryStatusMapping");
const {
  isOlderScanForWaybill,
  claimShippingsForTrackingPoll,
  trackingClaimTtlMs,
} = require("../services/delhivery/delhiveryTrackingSync.service");
const {
  partitionPackageScansForSync,
  getWaybillCursor,
} = require("../services/delhivery/delhiveryTrackingCursors");

const trackRow = ({
  awb = "WB100",
  type,
  status,
  nsl,
  scanTime,
  scans = [],
  instructions = "",
}) => ({
  ShipmentData: [
    {
      Shipment: {
        AWB: awb,
        Status: {
          Status: status,
          StatusType: type,
          StatusDateTime: scanTime || "2026-03-17T12:00:00",
        },
        Scans: scans.length
          ? scans
          : [
              {
                ScanDateTime: scanTime || "2026-03-17T12:00:00",
                ScanDetail: {
                  ScanType: type,
                  Scan: status,
                  StatusDateTime: scanTime || "2026-03-17T12:00:00",
                },
                Instructions:
                  instructions || (nsl ? `Remark ${nsl}` : "movement"),
              },
            ],
      },
    },
  ],
});

assert.strictEqual(mapDelhiveryStatusPairToAaysh("UD", "Manifested"), "Shipped");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("UD", "Not Picked"), "Shipped");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("UD", "In Transit"), "In Transit");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("UD", "Pending"), "In Transit");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("UD", "Dispatched"), "Out For Delivery");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("DL", "Delivered"), "Delivered");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("RT", "In Transit"), "RTO");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("RT", "Pending"), "RTO");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("RT", "Dispatched"), "RTO");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("DL", "RTO"), "RTO");
assert.strictEqual(mapDelhiveryStatusPairToAaysh("CN", "Cancelled"), null);
assert.strictEqual(mapDelhiveryStatusPairToAaysh("CN", "Closed"), null);

const delSnap = buildLatestTrackingSnapshot(trackRow({ type: "DL", status: "Delivered" }));
assert.strictEqual(
  resolveAayshStatusFromSnapshot(delSnap).aayshStatus,
  "Delivered"
);

const ndrSnap = buildLatestTrackingSnapshot(
  trackRow({ type: "UD", status: "In Transit", nsl: "EOD-74", scanTime: "2026-03-17T18:00:00" })
);
assert.strictEqual(detectUndeliveredFromSnapshot(ndrSnap), "Undelivered");
assert.strictEqual(
  resolveAayshStatusFromSnapshot(ndrSnap).aayshStatus,
  "Undelivered"
);

const reattemptNoScan = buildLatestTrackingSnapshot(
  trackRow({ type: "UD", status: "Dispatched", scanTime: "2026-03-17T10:00:00" })
);
assert.strictEqual(
  resolveAayshStatusFromSnapshot(reattemptNoScan).aayshStatus,
  "Out For Delivery"
);

const afterTransit = buildLatestTrackingSnapshot(
  trackRow({ type: "UD", status: "In Transit", scanTime: "2026-03-18T09:00:00" })
);
assert.strictEqual(
  resolveAayshStatusFromSnapshot(afterTransit).aayshStatus,
  "In Transit"
);

const unknown = resolveAayshStatusFromSnapshot(
  buildLatestTrackingSnapshot(trackRow({ type: "XX", status: "Weird" }))
);
assert.strictEqual(unknown.aayshStatus, null);

const oldTime = new Date("2026-03-16T08:00:00");
const newTime = new Date("2026-03-17T08:00:00");
assert.strictEqual(
  isOlderScanForWaybill(
    { lastSyncedScanAt: newTime, lastSyncedScanKey: "k2" },
    oldTime,
    "k1"
  ),
  true
);

const genericFailSnap = buildLatestTrackingSnapshot(
  trackRow({
    type: "UD",
    status: "In Transit",
    instructions: "failed delivery attempt pending",
    scanTime: "2026-03-17T12:00:00",
  })
);
assert.strictEqual(detectUndeliveredFromSnapshot(genericFailSnap), null);

const mpsShipping = {
  awbNumber: "M-MASTER",
  delhiveryPackageTrackCursors: [
    {
      waybill: "C1",
      lastSyncedScanAt: new Date("2026-03-18T12:00:00"),
      lastSyncedScanKey: "c1|synced",
    },
    {
      waybill: "C2",
      lastSyncedScanAt: new Date("2026-03-17T08:00:00"),
      lastSyncedScanKey: "c2|older",
    },
  ],
};

const pkgStatuses = [
  {
    waybill: "C1",
    aayshStatus: "In Transit",
    snapshot: buildLatestTrackingSnapshot(
      trackRow({
        awb: "C1",
        type: "UD",
        status: "In Transit",
        scanTime: "2026-03-18T11:00:00",
      })
    ),
  },
  {
    waybill: "C2",
    aayshStatus: "Out For Delivery",
    snapshot: buildLatestTrackingSnapshot(
      trackRow({
        awb: "C2",
        type: "UD",
        status: "Dispatched",
        scanTime: "2026-03-18T09:00:00",
      })
    ),
  },
];

const partitioned = partitionPackageScansForSync(
  mpsShipping,
  pkgStatuses,
  buildScanSyncKey
);
assert.strictEqual(partitioned.newScans.length, 1);
assert.strictEqual(partitioned.newScans[0].waybill, "C2");
assert.strictEqual(
  getWaybillCursor(mpsShipping, "C1").lastSyncedScanAt.getTime(),
  new Date("2026-03-18T12:00:00").getTime()
);

assert.ok(trackingClaimTtlMs() >= 30_000);
assert.strictEqual(typeof claimShippingsForTrackingPoll, "function");

const key1 = buildScanSyncKey({
  waybill: "WB1",
  eventTime: newTime,
  statusType: "UD",
  status: "In Transit",
  nslCode: "",
  location: "DEL",
});
assert.ok(key1.includes("WB1"));

const bulk = parseBulkTrackResponse({
  ShipmentData: [
    { Shipment: { AWB: "A1", Status: { Status: "In Transit", StatusType: "UD" } } },
    { Shipment: { AWB: "A2", Status: { Status: "Delivered", StatusType: "DL" } } },
  ],
});
assert.strictEqual(bulk.get("A1")?.waybill, "A1");
assert.strictEqual(bulk.get("A2")?.waybill, "A2");

const many = Array.from({ length: 55 }, (_, i) => `WB${i}`);
const batches = splitWaybillBatches(many);
assert.strictEqual(batches.length, 2);
assert.strictEqual(batches[0].length, MAX_WAYBILLS_PER_TRACK_REQUEST);
assert.strictEqual(batches[1].length, 5);

const mpsMixed = aggregateMpsPackageStatuses([
  { waybill: "C1", aayshStatus: "Delivered" },
  { waybill: "C2", aayshStatus: "In Transit" },
]);
assert.strictEqual(mpsMixed.aayshStatus, "In Transit");

const mpsAllDel = aggregateMpsPackageStatuses([
  { waybill: "C1", aayshStatus: "Delivered" },
  { waybill: "C2", aayshStatus: "Delivered" },
]);
assert.strictEqual(mpsAllDel.aayshStatus, "Delivered");

const mpsRtoIsolated = aggregateMpsPackageStatuses([
  { waybill: "C1", aayshStatus: "RTO" },
  { waybill: "C2", aayshStatus: "In Transit" },
]);
assert.strictEqual(mpsRtoIsolated.aayshStatus, "In Transit");

const genuineDelhiveryShipping = {
  courierName: "Delhivery",
  delhiveryManifestStatus: "success",
  delhiveryManifestedAt: new Date("2026-03-01T10:00:00Z"),
  delhiveryMasterAwb: "WB1",
  awbNumber: "WB1",
  shippingStatus: "Shipped",
};
const delhiveryShipping = genuineDelhiveryShipping;
const trackonShipping = { ...delhiveryShipping, courierName: "Trackon" };
const order = { isReversePickup: false };
assert.strictEqual(isDelhiveryManifestReady(genuineDelhiveryShipping), true);
assert.strictEqual(shouldPollDelhiveryShipping(genuineDelhiveryShipping, order), true);
assert.strictEqual(
  isDelhiveryManifestReady({
    ...genuineDelhiveryShipping,
    awbNumber: "  WB1  ",
    delhiveryMasterAwb: " WB1 ",
  }),
  true
);
assert.strictEqual(
  isDelhiveryManifestReady({
    ...genuineDelhiveryShipping,
    delhiveryManifestedAt: null,
  }),
  false
);
assert.strictEqual(
  isDelhiveryManifestReady({
    ...genuineDelhiveryShipping,
    delhiveryMasterAwb: "",
  }),
  false
);
assert.strictEqual(
  isDelhiveryManifestReady({
    ...genuineDelhiveryShipping,
    awbNumber: "",
  }),
  false
);
assert.strictEqual(
  isDelhiveryManifestReady({
    ...genuineDelhiveryShipping,
    awbNumber: "WB1",
    delhiveryMasterAwb: "WB2",
  }),
  false
);
assert.strictEqual(shouldPollDelhiveryShipping(delhiveryShipping, order), true);
assert.strictEqual(shouldPollDelhiveryShipping(trackonShipping, order), false);
assert.strictEqual(shouldPollDelhiveryShipping(delhiveryShipping, { isReversePickup: true }), false);
assert.strictEqual(isShippingStatusPastShipped({ shippingStatus: "Pending" }), false);
assert.strictEqual(isShippingStatusPastShipped({ shippingStatus: "Booked" }), false);
assert.strictEqual(isShippingStatusPastShipped({ shippingStatus: "Shipped" }), true);
assert.strictEqual(
  shouldPollDelhiveryShipping(
    { ...delhiveryShipping, shippingStatus: "Pending" },
    order
  ),
  false
);

assert.strictEqual(
  shouldPollDelhiveryShipping(
    { ...delhiveryShipping, shippingStatus: "Delivered" },
    order
  ),
  false
);

const trackingExcludedStatuses = [
  "Pending",
  "Booked",
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
];

for (const excluded of trackingExcludedStatuses) {
  assert.strictEqual(
    isDelhiveryTrackingEligibleStatus(excluded),
    false,
    `isDelhiveryTrackingEligibleStatus(${excluded})`
  );
  assert.strictEqual(
    shouldPollDelhiveryShipping(
      { ...delhiveryShipping, shippingStatus: excluded },
      order
    ),
    false,
    `shouldPollDelhiveryShipping(${excluded})`
  );
}

assert.strictEqual(isTerminalAayshStatus("Returned"), true);
assert.strictEqual(isTerminalAayshStatus("Exchange"), true);

const noTimeRaw = {
  ShipmentData: [
    {
      Shipment: {
        AWB: "WB-NOTIME",
        Status: { Status: "In Transit", StatusType: "UD" },
        Scans: [
          {
            ScanDetail: { ScanType: "UD", Scan: "In Transit" },
            Instructions: "hub sort",
          },
        ],
      },
    },
  ],
};

const noTimeSnap = buildLatestTrackingSnapshot(noTimeRaw);
assert.strictEqual(noTimeSnap.eventTime, null);

const noTimeKey = buildScanSyncKey({
  waybill: "WB-NOTIME",
  eventTime: new Date(0),
  statusType: noTimeSnap.statusType,
  status: noTimeSnap.status,
  nslCode: noTimeSnap.nslCode,
  location: noTimeSnap.location,
});

assert.strictEqual(
  isOlderScanForWaybill(
    { lastSyncedScanAt: null, lastSyncedScanKey: noTimeKey },
    null,
    noTimeKey
  ),
  true
);

const noTimeSnapOther = buildLatestTrackingSnapshot({
  ShipmentData: [
    {
      Shipment: {
        AWB: "WB-NOTIME",
        Status: { Status: "Dispatched", StatusType: "UD" },
        Scans: [
          {
            ScanDetail: { ScanType: "UD", Scan: "Dispatched" },
            Instructions: "out",
          },
        ],
      },
    },
  ],
});
assert.strictEqual(noTimeSnapOther.eventTime, null);

const otherKey = buildScanSyncKey({
  waybill: "WB-NOTIME",
  eventTime: new Date(0),
  statusType: noTimeSnapOther.statusType,
  status: noTimeSnapOther.status,
  nslCode: noTimeSnapOther.nslCode,
  location: noTimeSnapOther.location,
});

assert.strictEqual(otherKey !== noTimeKey, true);
assert.strictEqual(
  isOlderScanForWaybill(
    { lastSyncedScanAt: null, lastSyncedScanKey: noTimeKey },
    null,
    otherKey
  ),
  false
);

const shippingNoTimeCursor = {
  awbNumber: "WB-NOTIME",
  delhiveryLastSyncedScanAt: null,
  delhiveryLastSyncedScanKey: noTimeKey,
};

const pkgSameNoTime = [
  {
    waybill: "WB-NOTIME",
    aayshStatus: "In Transit",
    snapshot: noTimeSnap,
  },
];
const partSame = partitionPackageScansForSync(
  shippingNoTimeCursor,
  pkgSameNoTime,
  buildScanSyncKey
);
assert.strictEqual(partSame.newScans.length, 0);

const pkgNewNoTime = [
  {
    waybill: "WB-NOTIME",
    aayshStatus: "Out For Delivery",
    snapshot: noTimeSnapOther,
  },
];
const partNew = partitionPackageScansForSync(
  shippingNoTimeCursor,
  pkgNewNoTime,
  buildScanSyncKey
);
assert.strictEqual(partNew.newScans.length, 1);

console.log("delhiveryTracking.test.js: all assertions passed");