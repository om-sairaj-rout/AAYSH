const BASE = import.meta.env.VITE_API_URL;

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

  const res = await fetch(`${BASE}/api/reverse-pickups`, {
    method: "POST",
    ...defaultFetchOptions,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to submit reverse pickup request");
  }
  return data;
};

export const searchReversePickupCustomers = async (query) => {
  const params = new URLSearchParams({ q: String(query || "").trim() });
  const res = await fetch(
    `${BASE}/api/reverse-pickups/customers/search?${params.toString()}`,
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to search customers");
  }
  return data;
};

export const getReversePickups = async ({
  status,
  companyId,
  search,
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

  const res = await fetch(`${BASE}/api/reverse-pickups?${params.toString()}`, {
    method: "GET",
    ...defaultFetchOptions,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch reverse pickup requests");
  }
  return data;
};

export const approveReversePickup = async (id, payload) => {
  const res = await fetch(`${BASE}/api/admin/reverse-pickups/${id}/approve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to approve request");
  }
  return data;
};

export const rejectReversePickup = async (id, rejectionReason) => {
  const res = await fetch(`${BASE}/api/admin/reverse-pickups/${id}/reject`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify({ rejectionReason }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to reject request");
  }
  return data;
};

export const getReversePickupDocumentByOrderId = async (orderId) => {
  const res = await fetch(
    `${BASE}/api/reverse-pickups/order/${encodeURIComponent(orderId)}/document-url`,
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to get reverse pickup document");
  }

  if (data.legacy && data.url?.startsWith("/")) {
    return {
      url: `${BASE}${data.url}`,
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
    `${BASE}/api/reverse-pickups/${requestId}/document-url`,
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to get document URL");
  }

  if (data.legacy && data.url?.startsWith("/")) {
    return `${BASE}${data.url}`;
  }

  return data.url;
};
