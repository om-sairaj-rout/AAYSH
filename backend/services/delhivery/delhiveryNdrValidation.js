const NDR_ACTION = Object.freeze({
  RE_ATTEMPT: "RE-ATTEMPT",
  PICKUP_RESCHEDULE: "PICKUP_RESCHEDULE",
});

const RE_ATTEMPT_NSL = new Set([
  "EOD-74",
  "EOD-15",
  "EOD-104",
  "EOD-43",
  "EOD-86",
  "EOD-11",
  "EOD-69",
  "EOD-6",
]);

const PICKUP_RESCHEDULE_NSL = new Set(["EOD-777", "EOD-21"]);

const ACTIVE_NDR_STATUSES = new Set(["submitted", "uncertain"]);

const validateNdrAction = (action) => {
  const key = String(action || "").trim().toUpperCase();
  if (!Object.values(NDR_ACTION).includes(key)) {
    return {
      ok: false,
      message: `Unsupported action. Allowed: ${Object.values(NDR_ACTION).join(", ")}`,
    };
  }
  return { ok: true, action: key };
};

const isAttemptCountEligible = (attemptCount) =>
  attemptCount === 1 || attemptCount === 2;

const resolveShipmentKind = (order, shipping) => {
  if (order?.isReversePickup) return "rvp";
  if (String(shipping?.courierName || "").toLowerCase().includes("repl")) {
    return "repl";
  }
  return "forward";
};

const evaluateNdrEligibility = ({
  hints,
  order,
  shipping,
}) => {
  const result = {
    eligibleActions: [],
    reasons: {},
    hints,
    shipmentKind: resolveShipmentKind(order, shipping),
  };

  if (!hints?.verified) {
    result.reason = hints?.message || "Tracking could not be verified.";
    return result;
  }

  const attemptOk = isAttemptCountEligible(hints.attemptCount);
  if (!attemptOk) {
    result.reason = `Attempt count must be 1 or 2 (got ${hints.attemptCount}).`;
    return result;
  }

  const nsl = String(hints.nslCode || "").toUpperCase();
  const kind = result.shipmentKind;

  if (kind === "forward" || kind === "repl") {
    if (RE_ATTEMPT_NSL.has(nsl)) {
      result.eligibleActions.push(NDR_ACTION.RE_ATTEMPT);
    } else {
      result.reasons[NDR_ACTION.RE_ATTEMPT] =
        `NSL ${nsl} is not eligible for RE-ATTEMPT.`;
    }
  } else {
    result.reasons[NDR_ACTION.RE_ATTEMPT] =
      "RE-ATTEMPT is only for eligible forward shipments.";
  }

  if (kind === "rvp") {
    if (!hints.nonOtpCancelled) {
      result.reasons[NDR_ACTION.PICKUP_RESCHEDULE] =
        hints.otpCancelled
          ? "Pickup was OTP-cancelled; not eligible for PICKUP_RESCHEDULE."
          : "Shipment must be cancelled (non-OTP) for PICKUP_RESCHEDULE.";
    } else if (PICKUP_RESCHEDULE_NSL.has(nsl)) {
      result.eligibleActions.push(NDR_ACTION.PICKUP_RESCHEDULE);
    } else {
      result.reasons[NDR_ACTION.PICKUP_RESCHEDULE] =
        `NSL ${nsl} is not eligible for PICKUP_RESCHEDULE.`;
    }
  } else {
    result.reasons[NDR_ACTION.PICKUP_RESCHEDULE] =
      "PICKUP_RESCHEDULE is only for eligible reverse pickup shipments.";
  }

  if (!result.eligibleActions.length && !result.reason) {
    result.reason = "No NDR action is eligible for current tracking state.";
  }

  return result;
};

const sanitizeNdrPayloadForAudit = (raw) => {
  if (raw == null) return { summary: "empty" };
  if (typeof raw !== "object") return { summary: String(raw).slice(0, 300) };
  try {
    const clone = JSON.parse(JSON.stringify(raw));
    const scrub = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        if (/token|auth|password|secret|authorization/i.test(key)) {
          obj[key] = "[redacted]";
        } else if (typeof obj[key] === "object") scrub(obj[key]);
      }
    };
    scrub(clone);
    return clone;
  } catch {
    return { summary: "unparseable" };
  }
};

const extractUplIdFromSubmitResponse = (data) => {
  if (!data) return "";
  if (typeof data === "string" && data.trim()) return data.trim();
  const candidates = [
    data.upl_id,
    data.uplId,
    data.UPL_ID,
    data.upl,
    data.id,
    data.data?.upl_id,
    data.data?.[0]?.upl_id,
    data.upload_id,
  ];
  const found = candidates.find((v) => v != null && String(v).trim());
  return found ? String(found).trim() : "";
};

const parseNdrSubmitResponse = (response) => {
  const data = response?.data;
  const sanitized = sanitizeNdrPayloadForAudit(data);

  if (response?.status === 401 || response?.status === 403) {
    return {
      ok: false,
      confirmed: true,
      error_code: "AUTH_ERROR",
      message: "Delhivery authentication failed.",
      raw: sanitized,
    };
  }
  if (response?.status >= 500) {
    return {
      ok: false,
      uncertain: true,
      error_code: "SERVER_ERROR",
      message: "Delhivery server error on NDR submission.",
      raw: sanitized,
    };
  }

  const uplId = extractUplIdFromSubmitResponse(data);
  if (response?.status >= 200 && response?.status < 300 && uplId) {
    return {
      ok: true,
      confirmed: true,
      uplId,
      raw: sanitized,
    };
  }

  if (response?.status >= 200 && response?.status < 300) {
    return {
      ok: false,
      uncertain: true,
      unconfirmed: true,
      error_code: "UNCONFIRMED_RESPONSE",
      message:
        "Delhivery accepted the request but no UPL ID was returned. Treat as uncertain.",
      raw: sanitized,
    };
  }

  const message =
    (typeof data === "string" && data) ||
    data?.error ||
    data?.message ||
    "Delhivery rejected the NDR request.";
  return {
    ok: false,
    confirmed: true,
    message: String(message),
    raw: sanitized,
    http_status: response?.status,
  };
};

module.exports = {
  NDR_ACTION,
  RE_ATTEMPT_NSL,
  PICKUP_RESCHEDULE_NSL,
  ACTIVE_NDR_STATUSES,
  validateNdrAction,
  evaluateNdrEligibility,
  isAttemptCountEligible,
  sanitizeNdrPayloadForAudit,
  extractUplIdFromSubmitResponse,
  parseNdrSubmitResponse,
};