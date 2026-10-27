import { apiUrl } from "./apiBase.js";
import { parseJsonResponse } from "./jsonResponse.js";

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export const createReversePickup = async (payload) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === "supportingDocument") {
      if (value instanceof File) {
        formData.append("supportingDocument", value);
      }
      return;
    }
    formData.append(key, String(value));
  });

  const res = await fetch(apiUrl("/api/reverse-pickups"), {
    method: "POST",
    ...defaultFetchOptions,
    body: formData,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to submit reverse pickup request");
  }
  return data;
};

export const searchReversePickupCustomers = async (query) => {
  const params = new URLSearchParams({ q: String(query || "").trim() });
  const res = await fetch(
    apiUrl(`/api/reverse-pickups/customers/search?${params.toString()}`),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to search customers");
  }
  return data;
};

export const getReversePickups = async ({
  status,
  companyId,
  search,
  from,
  to,
  shippingStatus,
  page = 1,
  perPage = 20,
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (status && status !== "ALL") {
    params.append("status", status);
  }
  if (companyId && companyId !== "ALL") {
    params.append("company_id", companyId);
  }
  if (search && String(search).trim()) {
    params.append("search", String(search).trim());
  }
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (shippingStatus && shippingStatus !== "ALL") {
    params.append("shipping_status", shippingStatus);
  }

  const res = await fetch(apiUrl(`/api/reverse-pickups?${params.toString()}`), {
    method: "GET",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch reverse pickup requests");
  }
  return data;
};

export const approveReversePickup = async (id, payload) => {
  const res = await fetch(apiUrl(`/api/admin/reverse-pickups/${id}/approve`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify(payload),
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to approve request");
  }
  return data;
};

export const rejectReversePickup = async (id, rejectionReason) => {
  const res = await fetch(apiUrl(`/api/admin/reverse-pickups/${id}/reject`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify({ rejectionReason }),
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to reject request");
  }
  return data;
};

export const getReversePickupFailureReasons = async () => {
  const res = await fetch(apiUrl("/api/admin/reverse-pickups/failure-reasons"), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const { data } = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to load failure reasons");
  return data;
};

export const markReversePickupFailed = async (id, payload) => {
  const res = await fetch(apiUrl(`/api/admin/reverse-pickups/${id}/mark-failed`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify(payload),
  });
  const { data } = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to update request");
  return data;
};

export const getReversePickupDocumentByOrderId = async (orderId) => {
  const res = await fetch(
    apiUrl(`/api/reverse-pickups/order/${encodeURIComponent(orderId)}/document-url`),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to get reverse pickup document");
  }

  if (data.legacy && data.url?.startsWith("/")) {
    return {
      url: apiUrl(data.url),
      fileName: data.fileName || "reverse-pickup-document",
    };
  }

  return {
    url: data.url,
    fileName: data.fileName || "reverse-pickup-document",
  };
};

export const getReversePickupDocumentUrl = async (requestId) => {
  const res = await fetch(
    apiUrl(`/api/reverse-pickups/${requestId}/document-url`),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to get document URL");
  }

  if (data.legacy && data.url?.startsWith("/")) {
    return apiUrl(data.url);
  }

  return data.url;
};
