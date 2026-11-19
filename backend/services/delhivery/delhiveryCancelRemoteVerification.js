const { normalizeCourierStatusKey } = require("./delhiveryCancelShipmentValidation");
const { extractStatusFromTrackPayload } = require("./delhiveryPackageTrackApi");

const VERIFICATION_OUTCOME = Object.freeze({
  VERIFIED_CANCELLED: "verified_cancelled",
  NOT_CANCELLED_YET: "not_cancelled_yet",
  UNAVAILABLE: "verification_unavailable",
});

const extractStatusTypeFromTrackPayload = (data) => {
  if (!data) return "";
  const shipmentRow = Array.isArray(data.ShipmentData)
    ? data.ShipmentData[0]
    : data.ShipmentData;
  const shipment = shipmentRow?.Shipment || shipmentRow;
  const statusType =
    shipment?.Status?.StatusType ||
    shipment?.Status?.status_type ||
    shipment?.StatusType ||
    shipment?.status_type ||
    "";
  return String(statusType || "").trim().toUpperCase();
};

const verifyCancellationOnRemote = (trackRaw) => {
  const status = extractStatusFromTrackPayload(trackRaw);
  const key = normalizeCourierStatusKey(status);
  const statusType = extractStatusTypeFromTrackPayload(trackRaw);

  if (statusType === "CN" || key === "canceled" || key === "cancelled") {
    return {
      outcome: VERIFICATION_OUTCOME.VERIFIED_CANCELLED,
      message: "Delhivery tracking indicates the shipment is cancelled.",
      status,
      statusType,
    };
  }

  if (!status) {
    return {
      outcome: VERIFICATION_OUTCOME.UNAVAILABLE,
      message:
        "Tracking did not return a status to verify cancellation. Manual review required.",
    };
  }

  return {
    outcome: VERIFICATION_OUTCOME.NOT_CANCELLED_YET,
    message:
      "Cancellation could not be confirmed from tracking alone (status may remain Manifested/In Transit after cancel).",
    status,
    statusType,
  };
};

module.exports = {
  VERIFICATION_OUTCOME,
  verifyCancellationOnRemote,
  extractStatusTypeFromTrackPayload,
};