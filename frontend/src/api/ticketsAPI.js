const BASE = import.meta.env.VITE_API_URL;

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export const TICKET_CATEGORIES = [
  "Shipment",
  "AWB",
  "Pickup",
  "Billing",
  "Account",
  "Other",
];

export const createTicket = async (payload) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === "attachment") {
      if (value instanceof File) {
        formData.append("attachment", value);
      }
      return;
    }
    formData.append(key, String(value));
  });

  const res = await fetch(`${BASE}/api/tickets`, {
    method: "POST",
    ...defaultFetchOptions,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to submit ticket");
  }
  return data;
};

export const getTickets = async ({ status, page = 1, perPage = 20 } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status && status !== "ALL") {
    params.append("status", status);
  }

  const res = await fetch(`${BASE}/api/tickets?${params.toString()}`, {
    method: "GET",
    ...defaultFetchOptions,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch tickets");
  }
  return data;
};

export const getAdminTickets = async ({
  status,
  companyId,
  priority,
  page = 1,
  perPage = 50,
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status && status !== "ALL") params.append("status", status);
  if (companyId && companyId !== "ALL") params.append("company_id", companyId);
  if (priority && priority !== "ALL") params.append("priority", priority);

  const res = await fetch(`${BASE}/api/admin/tickets?${params.toString()}`, {
    method: "GET",
    ...defaultFetchOptions,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch tickets");
  }
  return data;
};

export const updateTicket = async (id, payload) => {
  const res = await fetch(`${BASE}/api/admin/tickets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update ticket");
  }
  return data;
};

export const getTicketAttachmentUrl = async (ticketId) => {
  const res = await fetch(`${BASE}/api/tickets/${ticketId}/attachment-url`, {
    method: "GET",
    ...defaultFetchOptions,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to get attachment URL");
  }

  const url =
    data.legacy && data.url?.startsWith("/") ? `${BASE}${data.url}` : data.url;

  return {
    url,
    fileName: data.fileName || "attachment",
  };
};
