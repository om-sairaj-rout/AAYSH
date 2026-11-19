const { DELHIVERY_EDIT_PT } = require("./delhiveryEditShipmentOperationLogic");
const { normalizePhoneList } = require("./delhiveryEditShipmentValidation");

const VERIFICATION_OUTCOME = Object.freeze({
  VERIFIED_APPLIED: "verified_applied",
  UNCHANGED_SAFE_TO_RETRY: "unchanged_safe_to_retry",
  PARTIAL_OR_MISMATCH: "partial_or_mismatch",
  UNAVAILABLE: "verification_unavailable",
});

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const extractEditableHintsFromTrackPayload = (data) => {
  if (!data) return { hints: {}, capabilities: [] };

  const shipmentRow = Array.isArray(data.ShipmentData)
    ? data.ShipmentData[0]
    : data.ShipmentData;
  const shipment = shipmentRow?.Shipment || shipmentRow || {};
  const consignee =
    shipment.Consignee ||
    shipment.consignee ||
    shipment.Destination ||
    shipment.destination ||
    {};

  const hints = {};
  const capabilities = [];

  const pick = (key, ...values) => {
    const raw = values.find((v) => v != null && String(v).trim() !== "");
    if (raw == null) return;
    hints[key] = raw;
    capabilities.push(key);
  };

  pick(
    "name",
    consignee.Name,
    consignee.name,
    shipment.ConsigneeName,
    shipment.consignee_name
  );
  pick(
    "add",
    consignee.Address,
    consignee.address,
    consignee.Add,
    shipment.DestinationAddress
  );
  pick(
    "phone",
    consignee.Phone,
    consignee.phone,
    consignee.Mobile,
    shipment.ConsigneePhone
  );

  pick(
    "pt",
    shipment.PaymentMode,
    shipment.payment_mode,
    shipment.PT,
    shipment.pt
  );
  pick(
    "cod",
    shipment.CODAmount,
    shipment.cod_amount,
    shipment.COD,
    shipment.cod
  );
  pick(
    "gm",
    shipment.Weight,
    shipment.weight,
    shipment.ChargedWeight,
    shipment.charged_weight
  );

  return { hints, capabilities };
};

const mapPtHint = (raw) => {
  const key = String(raw || "").trim().toUpperCase();
  if (key === "COD") return DELHIVERY_EDIT_PT.COD;
  if (key === "PREPAID" || key === "PRE-PAID") return DELHIVERY_EDIT_PT.PREPAID;
  return String(raw || "").trim();
};

const fieldMatches = (field, expected, remoteRaw) => {
  if (field === "phone") {
    const expectedPhones = Array.isArray(expected)
      ? expected
      : normalizePhoneList(expected, "");
    const remotePhones = normalizePhoneList(remoteRaw, "");
    if (!expectedPhones.length || !remotePhones.length) return null;
    return expectedPhones.some((p) => remotePhones.includes(p));
  }
  if (field === "cod" || field === "gm") {
    const a = Number(expected);
    const b = Number(remoteRaw);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.abs(a - b) < 0.02 || Math.abs(Math.round(a) - Math.round(b)) === 0;
  }
  if (field === "pt") {
    return mapPtHint(expected) === mapPtHint(remoteRaw);
  }
  return normalizeText(expected) === normalizeText(remoteRaw);
};

/**
 * Compare intended edit payload to fields available from packages/json tracking.
 * Does not treat scan status alone as proof of an edit.
 */
const verifyEditAgainstRemoteHints = ({ payloadTemplate, trackRaw }) => {
  const { hints, capabilities } = extractEditableHintsFromTrackPayload(trackRaw);
  const payload = payloadTemplate || {};
  const intendedFields = Object.keys(payload).filter((k) => k !== "waybill");

  if (!intendedFields.length) {
    return {
      outcome: VERIFICATION_OUTCOME.UNAVAILABLE,
      message: "No intended edit fields to verify.",
      capabilities,
    };
  }

  let verifiable = 0;
  let matched = 0;
  let mismatched = 0;
  const missingCapabilities = [];
  const mismatchedFields = [];

  for (const field of intendedFields) {
    if (!capabilities.includes(field)) {
      missingCapabilities.push(field);
      continue;
    }
    verifiable += 1;
    const comparison = fieldMatches(field, payload[field], hints[field]);
    if (comparison === null) {
      missingCapabilities.push(field);
      verifiable -= 1;
      continue;
    }
    if (comparison) matched += 1;
    else {
      mismatched += 1;
      mismatchedFields.push(field);
    }
  }

  if (verifiable === 0) {
    return {
      outcome: VERIFICATION_OUTCOME.UNAVAILABLE,
      message:
        "Tracking response does not expose fields needed to verify this edit. Manual Delhivery verification required.",
      capabilities,
      missingCapabilities,
    };
  }

  if (matched === verifiable) {
    return {
      outcome: VERIFICATION_OUTCOME.VERIFIED_APPLIED,
      message: "Remote shipment fields match the intended edit.",
      capabilities,
      matchedFields: intendedFields.filter((f) => capabilities.includes(f)),
    };
  }

  if (matched === 0 && mismatched > 0) {
    return {
      outcome: VERIFICATION_OUTCOME.UNCHANGED_SAFE_TO_RETRY,
      message:
        "Remote values appear unchanged for verifiable fields. A cautious edit retry may be possible.",
      capabilities,
      mismatchedFields,
    };
  }

  return {
    outcome: VERIFICATION_OUTCOME.PARTIAL_OR_MISMATCH,
    message:
      "Remote shipment appears partially updated or inconsistent. Manual intervention required.",
    capabilities,
    mismatchedFields,
    matchedCount: matched,
    verifiableCount: verifiable,
  };
};

module.exports = {
  VERIFICATION_OUTCOME,
  extractEditableHintsFromTrackPayload,
  verifyEditAgainstRemoteHints,
};
