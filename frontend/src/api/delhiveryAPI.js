import { apiUrl } from "./apiBase.js";

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export const fetchDelhiveryCodPrecheck = async ({
  destinationPin,
  paymentMethod = "COD",
  companyId,
  serviceType = "surface",
} = {}) => {
  const params = new URLSearchParams({
    destination_pin: String(destinationPin || "").trim(),
    payment_method: paymentMethod,
    service_type: serviceType,
  });

  if (companyId) {
    params.set("company_id", companyId);
  }

  const res = await fetch(
    apiUrl(`/api/delhivery/cod-precheck?${params.toString()}`),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || "Delhivery precheck failed");
  }

  return data;
};

export const fetchDelhiveryEditEligibility = async (orderId) => {
  const res = await fetch(apiUrl(`/api/delhivery/shipments/${orderId}/edit-eligibility`), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Could not load Delhivery edit eligibility");
  }
  return data;
};

export const fetchDelhiveryCancelEligibility = async (orderId) => {
  const res = await fetch(apiUrl(`/api/delhivery/shipments/${orderId}/cancel-eligibility`), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Could not load Delhivery cancel eligibility");
  }
  return data;
};

export const submitDelhiveryShipmentCancel = async (orderId, body) => {
  const res = await fetch(apiUrl(`/api/delhivery/shipments/${orderId}/cancel`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Delhivery cancellation failed");
    err.uncertain = data.uncertain;
    throw err;
  }
  return data;
};

export const checkDelhiveryNdrEligibility = async (orderId, waybill) => {
  const params = new URLSearchParams({ waybill: String(waybill || "") });
  const res = await fetch(
    apiUrl(`/api/delhivery/shipments/${orderId}/ndr-eligibility?${params}`),
    { method: "GET", ...defaultFetchOptions }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "NDR eligibility check failed");
  return data;
};

export const submitDelhiveryNdrAction = async (orderId, body) => {
  const res = await fetch(apiUrl(`/api/delhivery/shipments/${orderId}/ndr`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "NDR submission failed");
    err.uncertain = data.uncertain;
    throw err;
  }
  return data;
};

export const refreshDelhiveryUplStatus = async (uplId) => {
  const res = await fetch(apiUrl(`/api/delhivery/ndr/${encodeURIComponent(uplId)}/status`), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "UPL status fetch failed");
  return data;
};

export const listDelhiveryNdrHistory = async (orderId) => {
  const res = await fetch(apiUrl(`/api/delhivery/shipments/${orderId}/ndr/history`), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Could not load NDR history");
  return data;
};

export const fetchDelhiveryDocumentOptions = async (orderId) => {
  const res = await fetch(
    apiUrl(`/api/delhivery/shipments/${orderId}/documents/options`),
    { method: "GET", ...defaultFetchOptions }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Could not load Delhivery document options");
  }
  return data;
};

export const fetchDelhiveryShipmentDocument = async (orderId, { doc_type, waybill }) => {
  const params = new URLSearchParams({
    doc_type: String(doc_type || ""),
    waybill: String(waybill || ""),
  });
  const res = await fetch(
    apiUrl(`/api/delhivery/shipments/${orderId}/documents?${params.toString()}`),
    { method: "GET", ...defaultFetchOptions }
  );
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Delhivery document not available");
    }
    if (data?.data?.delivery === "url" && data.data.url) {
      return { mode: "url", url: data.data.url };
    }
    throw new Error(data.message || "Unexpected Delhivery document response");
  }
  if (!res.ok) {
    throw new Error("Delhivery document not available");
  }
  const disposition = res.headers.get("content-disposition") || "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const blob = await res.blob();
  return {
    mode: "blob",
    blob,
    filename: match?.[1] || `${doc_type}.bin`,
  };
};

export const submitDelhiveryShipmentEdit = async (orderId, body) => {
  const payload = { ...(body || {}) };
  if (body?.resume_operation_id) {
    payload.resume_operation_id = body.resume_operation_id;
  }
  const res = await fetch(apiUrl(`/api/delhivery/shipments/${orderId}/edit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    ...defaultFetchOptions,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Delhivery edit failed");
    err.uncertain = data.uncertain;
    throw err;
  }
  return data;
};
