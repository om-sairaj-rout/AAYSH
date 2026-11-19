const { delhiveryGet } = require("./delhiveryHttpClient");

const TRACK_PATH = "/api/v1/packages/json/";

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const extractStatusFromTrackPayload = (data) => {
  if (!data) return "";
  const shipmentRow = Array.isArray(data.ShipmentData)
    ? data.ShipmentData[0]
    : data.ShipmentData;
  const shipment = shipmentRow?.Shipment || shipmentRow;
  const status =
    shipment?.Status?.Status ||
    shipment?.Status ||
    shipment?.status ||
    data?.Status ||
    "";
  return String(status || "").trim();
};

/**
 * Fetches latest package status from Delhivery tracking API (existing HTTP client).
 * Does not persist; used for edit eligibility only.
 */
const fetchDelhiveryPackageStatus = async (waybill) => {
  const wb = String(waybill || "").trim();
  if (!wb) {
    return {
      ok: false,
      error_code: "INVALID_WAYBILL",
      message: "Waybill is required for status verification.",
    };
  }

  try {
    const response = await delhiveryGet(TRACK_PATH, { waybill: wb });
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        verified: false,
        error_code: "AUTH_ERROR",
        message: "Delhivery authentication failed while verifying shipment status.",
        http_status: response.status,
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        verified: false,
        uncertain: true,
        error_code: "SERVER_ERROR",
        message:
          "Could not verify Delhivery status (server error). Try again later before editing.",
        http_status: response.status,
      };
    }
    if (response.status >= 400) {
      return {
        ok: false,
        verified: false,
        error_code: "CLIENT_ERROR",
        message: "Delhivery could not return shipment status for this waybill.",
        http_status: response.status,
        raw: response.data,
      };
    }

    const status = extractStatusFromTrackPayload(response.data);
    if (!status) {
      return {
        ok: false,
        verified: false,
        error_code: "STATUS_UNKNOWN",
        message:
          "Delhivery did not return a recognizable shipment status. Editing is not allowed until status is verified.",
        raw: response.data,
      };
    }

    return {
      ok: true,
      verified: true,
      status,
      raw: response.data,
      http_status: response.status,
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      return {
        ok: false,
        verified: false,
        uncertain: true,
        error_code: "TIMEOUT",
        message:
          "Delhivery status verification timed out. Do not edit until status is confirmed.",
      };
    }
    if (err.code === "DELHIVERY_NOT_CONFIGURED") {
      return {
        ok: false,
        verified: false,
        error_code: err.code,
        message: err.message,
      };
    }
    return {
      ok: false,
      verified: false,
      uncertain: true,
      error_code: "NETWORK_ERROR",
      message: "Network error while verifying Delhivery shipment status.",
    };
  }
};

const MAX_WAYBILLS_PER_TRACK_REQUEST = 50;

const splitWaybillBatches = (waybills, batchSize = MAX_WAYBILLS_PER_TRACK_REQUEST) => {
  const unique = [
    ...new Set(
      (waybills || []).map((w) => String(w || "").trim()).filter(Boolean)
    ),
  ];
  const batches = [];
  for (let i = 0; i < unique.length; i += batchSize) {
    batches.push(unique.slice(i, i + batchSize));
  }
  return batches;
};

const fetchDelhiveryPackagesTrackBulk = async (waybills) => {
  const batches = splitWaybillBatches(waybills);
  if (!batches.length) {
    return {
      ok: false,
      error_code: "INVALID_WAYBILL",
      message: "At least one waybill is required.",
    };
  }

  const merged = { ShipmentData: [] };
  const errors = [];

  for (const batch of batches) {
    try {
      const response = await delhiveryGet(TRACK_PATH, {
        waybill: batch.join(","),
        ref_ids: "",
      });

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          verified: false,
          error_code: "AUTH_ERROR",
          message: "Delhivery authentication failed while fetching tracking.",
          http_status: response.status,
        };
      }

      if (response.status >= 500) {
        errors.push({
          batch_size: batch.length,
          http_status: response.status,
          uncertain: true,
        });
        continue;
      }

      if (response.status >= 400) {
        errors.push({
          batch_size: batch.length,
          http_status: response.status,
        });
        continue;
      }

      const rows = Array.isArray(response.data?.ShipmentData)
        ? response.data.ShipmentData
        : response.data?.ShipmentData
          ? [response.data.ShipmentData]
          : [];

      if (rows.length) {
        merged.ShipmentData.push(...rows);
      }
    } catch (err) {
      if (isTimeoutError(err)) {
        errors.push({ batch_size: batch.length, error_code: "TIMEOUT", uncertain: true });
      } else if (err.code === "DELHIVERY_NOT_CONFIGURED") {
        return {
          ok: false,
          error_code: err.code,
          message: err.message,
        };
      } else {
        errors.push({
          batch_size: batch.length,
          error_code: "NETWORK_ERROR",
          uncertain: true,
          message: err.message,
        });
      }
    }
  }

  if (!merged.ShipmentData.length) {
    return {
      ok: false,
      error_code: "EMPTY_RESPONSE",
      message: "Delhivery returned no tracking rows.",
      errors,
      uncertain: errors.some((e) => e.uncertain),
    };
  }

  return {
    ok: true,
    raw: merged,
    errors: errors.length ? errors : undefined,
    partial: errors.length > 0,
  };
};

const fetchDelhiveryPackageTrackRaw = async (waybill) => {
  const wb = String(waybill || "").trim();
  if (!wb) {
    return { ok: false, message: "Waybill is required." };
  }
  try {
    const response = await delhiveryGet(TRACK_PATH, { waybill: wb });
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, raw: response.data, http_status: response.status };
    }
    return {
      ok: false,
      message: "Could not fetch Delhivery package details.",
      http_status: response.status,
      raw: response.data,
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      return { ok: false, uncertain: true, message: "Package detail fetch timed out." };
    }
    return { ok: false, uncertain: true, message: err.message || "Package detail fetch failed." };
  }
};

module.exports = {
  TRACK_PATH,
  MAX_WAYBILLS_PER_TRACK_REQUEST,
  splitWaybillBatches,
  extractStatusFromTrackPayload,
  fetchDelhiveryPackageStatus,
  fetchDelhiveryPackageTrackRaw,
  fetchDelhiveryPackagesTrackBulk,
};
