const TERMINAL_AAYSH_STATUSES = new Set([
  "Delivered",
  "Cancelled",
  "RTO",
  "Returned",
  "Exchange",
]);

const FORWARD_PROGRESS_RANK = Object.freeze({
  Booked: 5,
  Shipped: 10,
  Delayed: 15,
  "In Transit": 20,
  Undelivered: 25,
  "Out For Delivery": 30,
  RTO: 35,
  Delivered: 40,
});

const REVERSE_PICKUP_CODES = new Set(["RPRU", "RPRS", "RPSS", "RPSN"]);

/** Proposed mapping — adjust after live API validation. */
const TRACKON_CODE_TO_AAYSH = Object.freeze({
  BOKN: "Booked",
  BOKD: "Booked",
  PRSS: "Shipped",
  FMDT: "Shipped",
  SPHO: "In Transit",
  MFTD: "In Transit",
  MFTF: "In Transit",
  MMFT: "In Transit",
  VFWD: "In Transit",
  CDOT: "In Transit",
  CDIN: "In Transit",
  CDIE: "In Transit",
  IMMF: "In Transit",
  VMMF: "In Transit",
  IMFT: "In Transit",
  IMFE: "In Transit",
  ISMT: "In Transit",
  ISMD: "In Transit",
  ISTE: "In Transit",
  ISDE: "In Transit",
  DRMG: "In Transit",
  DRBG: "In Transit",
  RELE: "In Transit",
  DRSG: "Out For Delivery",
  DRSF: "Out For Delivery",
  DDUB: "Delivered",
  DDUF: "Delivered",
  DDUA: "Delivered",
  DNUB: "Undelivered",
  DNUF: "Undelivered",
  DNUA: "Undelivered",
  IMFS: "In Transit",
  IMFD: "In Transit",
  ISMS: "In Transit",
  ISDD: "In Transit",
  ISSS: "In Transit",
  MIRT: "Delayed",
  MIRB: "Delayed",
  HELD: "Delayed",
  RSET: "RTO",
  RMFT: "RTO",
  RIST: "RTO",
  RISR: "RTO",
  RITE: "RTO",
  RIRE: "RTO",
  RHOB: "RTO",
  RHOD: "RTO",
  RHON: "RTO",
});

const rankOf = (status) =>
  FORWARD_PROGRESS_RANK[String(status || "").trim()] ?? -1;

const isTerminalAayshStatus = (status) =>
  TERMINAL_AAYSH_STATUSES.has(String(status || "").trim());

const isReversePickupTrackonCode = (code) =>
  REVERSE_PICKUP_CODES.has(String(code || "").trim().toUpperCase());

const mapTrackonCodeToAaysh = (trackingCode) => {
  const code = String(trackingCode || "").trim().toUpperCase();
  if (!code) return null;
  if (code === "PRSN") {
    return {
      aayshStatus: null,
      skipStatusChange: true,
      pickupClosureFailed: true,
    };
  }
  if (code === "PRSG") {
    return {
      aayshStatus: null,
      skipStatusChange: true,
    };
  }
  if (isReversePickupTrackonCode(code)) {
    return { aayshStatus: null, reversePickupCode: true };
  }
  const mapped = TRACKON_CODE_TO_AAYSH[code];
  if (!mapped) {
    return { aayshStatus: null, unknownCode: true };
  }
  return { aayshStatus: mapped };
};

/**
 * Never regress Delivered/RTO; otherwise require forward rank advance (or lateral Undelivered/Delayed).
 */
const shouldApplyTrackonMappedStatus = (currentStatus, nextStatus) => {
  const current = String(currentStatus || "").trim();
  const next = String(nextStatus || "").trim();
  if (!next) return false;
  if (current === "Delivered" || current === "RTO") return false;
  if (next === current) return true;
  const currentRank = rankOf(current);
  const nextRank = rankOf(next);
  if (currentRank < 0) return true;
  if (nextRank < 0) return false;
  return nextRank >= currentRank;
};

module.exports = {
  TERMINAL_AAYSH_STATUSES,
  FORWARD_PROGRESS_RANK,
  TRACKON_CODE_TO_AAYSH,
  REVERSE_PICKUP_CODES,
  isTerminalAayshStatus,
  isReversePickupTrackonCode,
  mapTrackonCodeToAaysh,
  shouldApplyTrackonMappedStatus,
  rankOf,
};