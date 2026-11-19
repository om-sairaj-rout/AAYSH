const { delhiveryPostFormJson } = require("./delhiveryHttpClient");

const CREATE_PATH = "/api/cmu/create.json";

const isTimeoutError = (err) =>
  err.code === "ECONNABORTED" ||
  err.code === "ETIMEDOUT" ||
  /timeout/i.test(err.message || "");

const mapDelhiveryTransportError = (err) => {
  if (isTimeoutError(err)) {
    return {
      api_error: true,
      uncertain: true,
      error_code: "TIMEOUT",
      message: "Delhivery shipment request timed out.",
    };
  }
  if (err.code === "DELHIVERY_NOT_CONFIGURED") {
    return {
      api_error: true,
      error_code: err.code,
      message: err.message,
    };
  }
  return {
    api_error: true,
    uncertain: true,
    error_code: "NETWORK_ERROR",
    message: "Delhivery shipment request failed.",
  };
};

const mapDelhiveryHttpResponse = (response) => {
  if (response.status === 401 || response.status === 403) {
    return {
      api_error: true,
      error_code: "AUTH_ERROR",
      http_status: response.status,
      message: "Delhivery authentication failed.",
      raw: response.data,
    };
  }

  const data = response.data;

  if (response.status >= 500) {
    return {
      api_error: true,
      uncertain: true,
      error_code: "SERVER_ERROR",
      http_status: response.status,
      message: "Delhivery server error.",
      raw: data,
    };
  }

  const packageResults = extractPackageResults(data);

  const allSuccess =
    packageResults.length > 0 && packageResults.every((p) => p.success);

  const partialSuccess =
    packageResults.some((p) => p.success) &&
    packageResults.some((p) => !p.success);

  if (partialSuccess) {
    return {
      api_error: true,
      uncertain: true,
      error_code: "PARTIAL_MPS_FAILURE",
      http_status: response.status,
      message:
        extractErrorMessage(data) ||
        "Delhivery partially accepted the shipment. Manual verification required.",
      raw: data,
      packages: packageResults,
    };
  }

  if (response.status >= 400 && !allSuccess) {
    return {
      api_error: true,
      error_code: "CLIENT_ERROR",
      http_status: response.status,
      message: extractErrorMessage(data) || "Delhivery rejected the shipment.",
      raw: data,
      packages: packageResults,
    };
  }

  if (!allSuccess) {
    return {
      api_error: true,
      uncertain: true,
      error_code: "UNEXPECTED_RESPONSE",
      http_status: response.status,
      message:
        extractErrorMessage(data) ||
        "Delhivery response did not confirm all packages.",
      raw: data,
      packages: packageResults,
    };
  }

  return {
    api_error: false,
    http_status: response.status,
    raw: data,
    packages: packageResults,
  };
};

const createDelhiveryShipment = async (payload) => {
  if (!payload?.shipments?.length) {
    return {
      api_error: true,
      error_code: "INVALID_PAYLOAD",
      message: "Delhivery shipment payload is empty.",
    };
  }

  let response;
  try {
    response = await delhiveryPostFormJson(CREATE_PATH, payload);
  } catch (err) {
    return mapDelhiveryTransportError(err);
  }

  return mapDelhiveryHttpResponse(response);
};

const extractErrorMessage = (data) => {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.error) return String(data.error);
  if (data.message) return String(data.message);
  if (data.rmk) return String(data.rmk);
  return "";
};

const extractPackageResults = (data) => {
  if (!data) return [];
  const list =
    data.packages ||
    data.package_status ||
    data.Package ||
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(list)) {
    if (data.success === true && data.waybill) {
      return [
        {
          waybill: String(data.waybill),
          success: true,
          status: "Success",
        },
      ];
    }
    return [];
  }

  return list.map((row) => {
    const status = String(row.status || row.Status || row.remark || "").trim();
    const waybill = String(
      row.waybill || row.wbn || row.Waybill || row.barcode || ""
    ).trim();
    const success = /success/i.test(status) || row.status === true;
    return {
      waybill,
      status,
      success,
      raw: row,
    };
  });
};

module.exports = {
  createDelhiveryShipment,
  extractPackageResults,
  mapDelhiveryTransportError,
  mapDelhiveryHttpResponse,
  isTimeoutError,
};
