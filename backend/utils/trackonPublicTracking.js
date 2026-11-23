const { isTrackonTrackingConfigured } = require("../config/trackonTrackingConfig");
const { fetchTrackonAwbTracking } = require("../services/trackon/trackonAwbTrackingApi");
const { parseTrackonTrackingPayload } = require("../services/trackon/trackonTrackParse");
const {
  mapTrackonCodeToAaysh,
  pickBestForwardTrackonStatusEvent,
} = require("../services/trackon/trackonStatusMapping");
const { toISTDateTime } = require("./dateTime");

const statusForTrackonEvent = (ev) => {
  const mapped = mapTrackonCodeToAaysh(ev.trackingCode);
  if (mapped?.aayshStatus) return mapped.aayshStatus;
  return "In Transit";
};

const buildTrackingRowsFromTrackonEvents = (events) => {
  const rows = [];
  for (const ev of events || []) {
    if (!ev.trackingCode && !ev.currentStatus) continue;
    const eventTime = ev.eventAt || null;
    rows.push({
      status: statusForTrackonEvent(ev),
      location: String(ev.city || "").trim(),
      remarks:
        ev.remarks ||
        [ev.trackingCode, ev.currentStatus].filter(Boolean).join(" — "),
      failureReason: String(ev.ndrReason || "").trim(),
      eventTime: eventTime ? toISTDateTime(eventTime) : toISTDateTime(new Date()),
    });
  }
  rows.sort(
    (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
  );
  return rows;
};

const fetchTrackonPublicTrackingBundle = async (awbNumber) => {
  const awb = String(awbNumber || "").trim();
  if (!awb) {
    return { ok: false, status: 400, message: "AWB number is required" };
  }

  if (!isTrackonTrackingConfigured()) {
    return {
      ok: false,
      status: 404,
      message: "No shipment found for this AWB number.",
    };
  }

  const track = await fetchTrackonAwbTracking(awb);

  if (!track.ok) {
    if (track.error_code === "INVALID_AWB") {
      return { ok: false, status: 400, message: "Please enter a valid AWB number." };
    }
    if (
      track.error_code === "AUTH_ERROR" ||
      track.error_code === "TRACKON_NOT_CONFIGURED"
    ) {
      return {
        ok: false,
        status: 503,
        message: "Carrier tracking is temporarily unavailable. Please try again later.",
      };
    }
    return {
      ok: false,
      status: 404,
      message: "No shipment found for this AWB number.",
    };
  }

  const parsed = parseTrackonTrackingPayload(track.raw);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 404,
      message: "No shipment found for this AWB number.",
    };
  }

  const hasData =
    (parsed.events && parsed.events.length > 0) ||
    (parsed.summary && Object.keys(parsed.summary).length > 0);

  if (!hasData) {
    return {
      ok: false,
      status: 404,
      message: "No shipment found for this AWB number.",
    };
  }

  const best = pickBestForwardTrackonStatusEvent(parsed.events);
  const shippingStatus = best?.mapped?.aayshStatus || "In Transit";
  const tracking = buildTrackingRowsFromTrackonEvents(parsed.events);

  if (!tracking.length && best) {
    tracking.push({
      status: shippingStatus,
      location: String(best.ev.city || "").trim(),
      remarks:
        best.ev.remarks ||
        [best.ev.trackingCode, best.ev.currentStatus].filter(Boolean).join(" — "),
      failureReason: "",
      eventTime: best.ev.eventAt
        ? toISTDateTime(best.ev.eventAt)
        : toISTDateTime(new Date()),
    });
  }

  return {
    ok: true,
    trackonOnly: true,
    order: {
      courierStatus: shippingStatus,
      externalOrderId: "",
    },
    shipping: {
      awbNumber: parsed.awb || awb,
      shippingStatus,
      courierName: "TRACKON",
      pickupDate: null,
    },
    tracking,
    expectedDeliveryDate: null,
  };
};

module.exports = {
  fetchTrackonPublicTrackingBundle,
  buildTrackingRowsFromTrackonEvents,
  statusForTrackonEvent,
};