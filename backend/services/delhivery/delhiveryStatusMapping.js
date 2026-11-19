const { RE_ATTEMPT_NSL } = require("./delhiveryNdrValidation");

/** NSL codes that indicate a confirmed failed forward delivery attempt (NDR), not a pickup issue. */
const UNDELIVERED_NSL = RE_ATTEMPT_NSL;

const normalizeDelhiveryStatusKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const TERMINAL_AAYSH_STATUSES = new Set([
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
]);

const TRACKABLE_AAYSH_STATUSES = new Set([
  "Shipped",
  "In Transit",
  "Out For Delivery",
  "Undelivered",
  "Delayed",
]);

const isTerminalAayshStatus = (status) =>
  TERMINAL_AAYSH_STATUSES.has(String(status || "").trim());

const isDelhiveryTrackingEligibleStatus = (status) => {
  const key = String(status || "").trim();
  if (key === "Pending" || key === "Booked") return false;
  if (isTerminalAayshStatus(key)) return false;
  return true;
};

/**
 * Map Delhivery StatusType + Status to an existing Aaysh status, or null when unknown.
 */
const mapDelhiveryStatusPairToAaysh = (statusType, statusLabel) => {
  const type = String(statusType || "").trim().toUpperCase();
  const status = normalizeDelhiveryStatusKey(statusLabel);

  if (!type && !status) return null;

  if (type === "UD") {
    if (status === "manifested" || status === "not picked") return "Shipped";
    if (status === "in transit" || status === "pending") return "In Transit";
    if (status === "dispatched") return "Out For Delivery";
    if (status === "delivered") return "Delivered";
    if (/undelivered/.test(status)) return "Undelivered";
  }

  if (type === "DL") {
    if (status === "delivered") return "Delivered";
    if (status === "rto") return "RTO";
  }

  if (type === "RT") {
    if (
      status === "in transit" ||
      status === "pending" ||
      status === "dispatched" ||
      status === "rto"
    ) {
      return "RTO";
    }
  }

  if (type === "CN") {
    return null;
  }

  if (!type && status === "delivered") return "Delivered";

  return null;
};

const detectExplicitDelayedScan = (statusLabel, remark) => {
  const blob = `${statusLabel || ""} ${remark || ""}`.toLowerCase();
  if (/\bdelayed\b/.test(blob) && !/\bdelayed delivery\b.*cancel/i.test(blob)) {
    return true;
  }
  return false;
};

const detectUndeliveredFromSnapshot = (snapshot) => {
  const type = String(snapshot?.statusType || "").trim().toUpperCase();
  if (type === "RT" || type === "CN") return null;

  const status = normalizeDelhiveryStatusKey(snapshot?.status);
  if (status === "undelivered" || status === "not delivered") {
    return "Undelivered";
  }

  const nsl = String(snapshot?.nslCode || "").toUpperCase();
  if (nsl && UNDELIVERED_NSL.has(nsl) && type === "UD") {
    return "Undelivered";
  }

  return null;
};

/**
 * Derive Aaysh status from a tracking snapshot (latest scan + hints).
 */
const resolveAayshStatusFromSnapshot = (snapshot) => {
  if (!snapshot?.ok) return { aayshStatus: null, reason: snapshot?.message };

  const undelivered = detectUndeliveredFromSnapshot(snapshot);
  if (undelivered) {
    return {
      aayshStatus: undelivered,
      failureReason: snapshot.remark || snapshot.status || "",
      mappedFrom: "undelivered_scan",
    };
  }

  let aayshStatus = mapDelhiveryStatusPairToAaysh(
    snapshot.statusType,
    snapshot.status
  );

  if (
    detectExplicitDelayedScan(snapshot.status, snapshot.remark) &&
    aayshStatus &&
      aayshStatus !== "Delivered" &&
      aayshStatus !== "RTO" &&
      aayshStatus !== "Cancelled"
  ) {
    return {
      aayshStatus: "Delayed",
      mappedFrom: "explicit_delayed_scan",
    };
  }

  if (!aayshStatus) {
    return {
      aayshStatus: null,
      reason: `Unmapped Delhivery status ${snapshot.statusType}/${snapshot.status}`,
    };
  }

  return {
    aayshStatus,
    mappedFrom: "status_table",
  };
};

module.exports = {
  UNDELIVERED_NSL,
  TERMINAL_AAYSH_STATUSES,
  TRACKABLE_AAYSH_STATUSES,
  isTerminalAayshStatus,
  isDelhiveryTrackingEligibleStatus,
  mapDelhiveryStatusPairToAaysh,
  resolveAayshStatusFromSnapshot,
  detectUndeliveredFromSnapshot,
};