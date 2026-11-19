const { extractStatusFromTrackPayload } = require("./delhiveryPackageTrackApi");

const NSL_PATTERN = /EOD-\d+/gi;

const pickShipment = (raw) => {
  const row = Array.isArray(raw?.ShipmentData)
    ? raw.ShipmentData[0]
    : raw?.ShipmentData;
  return row?.Shipment || row || {};
};

const collectTextBlobs = (shipment) => {
  const scans = Array.isArray(shipment?.Scans)
    ? shipment.Scans
    : Array.isArray(shipment?.scans)
      ? shipment.scans
      : [];
  const blobs = [];
  for (const scan of scans) {
    blobs.push(
      scan?.Instructions,
      scan?.ScanDetail,
      scan?.StatusCode,
      scan?.Scan,
      scan?.Remarks,
      scan?.status
    );
  }
  blobs.push(
    shipment?.Status?.Instructions,
    shipment?.Status?.StatusCode,
    shipment?.Status?.Status,
    shipment?.NSLCode,
    shipment?.nsl_code,
    shipment?.Remark,
    shipment?.Instructions
  );
  return blobs.filter((v) => v != null).map((v) => String(v));
};

const extractNslCodes = (shipment) => {
  const found = new Set();
  for (const blob of collectTextBlobs(shipment)) {
    const matches = blob.match(NSL_PATTERN) || [];
    for (const m of matches) found.add(String(m).toUpperCase());
  }
  return [...found];
};

const pickPrimaryNsl = (codes) => {
  if (!codes.length) return "";
  return codes[0];
};

const extractAttemptCount = (shipment, raw) => {
  const candidates = [
    shipment?.AttemptCount,
    shipment?.attempt_count,
    shipment?.NDRAttempt,
    shipment?.ndr_attempt,
    shipment?.PickupAttemptCount,
    shipment?.pickup_attempt_count,
    shipment?.Status?.AttemptCount,
    shipment?.Status?.AttemptNo,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const scans = Array.isArray(shipment?.Scans) ? shipment.Scans : [];
  const ofd = scans.filter((s) =>
    /out for delivery|ofd|attempt/i.test(String(s?.Scan || s?.Instructions || ""))
  );
  if (ofd.length > 0) return ofd.length;
  return null;
};

const detectOtpCancellation = (shipment) => {
  const hits = collectTextBlobs(shipment)
    .join(" ")
    .toLowerCase();
  if (shipment?.OTPCancellation === true || shipment?.otp_cancellation === true) {
    return true;
  }
  return /\botp\b/.test(hits) && /cancel/i.test(hits);
};

const extractNdrHintsFromTrack = (raw) => {
  if (!raw) {
    return {
      verified: false,
      message: "Delhivery tracking response was empty.",
    };
  }
  const shipment = pickShipment(raw);
  const nslCodes = extractNslCodes(shipment);
  const nslCode = pickPrimaryNsl(nslCodes);
  const attemptCount = extractAttemptCount(shipment, raw);
  const delhiveryStatus = extractStatusFromTrackPayload(raw);
  const statusKey = String(delhiveryStatus || "")
    .trim()
    .toLowerCase();
  const otpCancelled = detectOtpCancellation(shipment);
  const isCancelled =
    statusKey === "cancelled" ||
    statusKey === "canceled" ||
    /cancel/i.test(delhiveryStatus || "");

  if (!nslCode) {
    return {
      verified: false,
      delhiveryStatus,
      attemptCount,
      nslCodes,
      isCancelled,
      otpCancelled,
      message:
        "NSL code could not be determined from Delhivery tracking. NDR cannot be submitted safely.",
    };
  }
  if (attemptCount == null) {
    return {
      verified: false,
      delhiveryStatus,
      nslCode,
      nslCodes,
      isCancelled,
      otpCancelled,
      message:
        "Attempt count could not be determined from Delhivery tracking. NDR cannot be submitted safely.",
    };
  }

  return {
    verified: true,
    delhiveryStatus,
    nslCode,
    nslCodes,
    attemptCount,
    isCancelled,
    otpCancelled,
    nonOtpCancelled: isCancelled && !otpCancelled,
  };
};

module.exports = {
  extractNdrHintsFromTrack,
  extractNslCodes,
  extractAttemptCount,
  detectOtpCancellation,
};