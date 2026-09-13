const BASE = import.meta.env.VITE_API_URL;

const jsonRequest = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
};

export const createPickupScheduleAPI = (payload) =>
  jsonRequest(`${BASE}/api/pickup-schedules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getPickupSchedulesAPI = ({
  tab = "scheduled",
  search,
  page = 1,
  perPage = 20,
  companyId,
} = {}) => {
  const params = new URLSearchParams({
    tab,
    page: String(page),
    per_page: String(perPage),
  });
  if (search) params.append("search", search);
  if (companyId) params.append("company_id", companyId);
  return jsonRequest(`${BASE}/api/pickup-schedules?${params.toString()}`);
};

export const cancelPickupScheduleAPI = (id) =>
  jsonRequest(`${BASE}/api/pickup-schedules/${id}/cancel`, {
    method: "PUT",
  });

export const reschedulePickupScheduleAPI = (id, payload) =>
  jsonRequest(`${BASE}/api/pickup-schedules/${id}/reschedule`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const completePickupScheduleAPI = (id, payload, documents = []) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(payload));

  if (documents.length > 0) {
    const isMultiOrder =
      Array.isArray(payload?.orders) && payload.orders.length > 0;

    if (!isMultiOrder && !payload?.document_meta) {
      formData.append(
        "document_types",
        JSON.stringify(documents.map((item) => item.documentType))
      );
    }

    documents.forEach((item) => {
      const file = item.file || item;
      if (file) formData.append("documents", file);
    });
  }
  return fetch(`${BASE}/api/pickup-schedules/${id}/complete`, {
    method: "POST",
    credentials: "include",
    body: formData,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to complete pickup");
    }
    return data;
  });
};
