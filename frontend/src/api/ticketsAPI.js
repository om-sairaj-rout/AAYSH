import { apiUrl } from "./apiBase.js";
import { parseJsonResponse } from "./jsonResponse.js";

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export { TICKET_ISSUE_GROUPS, TICKET_ISSUE_TYPES } from "../utils/ticketIssueTypes";

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
    if (key === "issueTypes" && Array.isArray(value)) {
      formData.append("issueTypes", JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });

  const res = await fetch(apiUrl("/api/tickets"), {
    method: "POST",
    ...defaultFetchOptions,
    body: formData,
  });

  const { data } = await parseJsonResponse(res);
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

  const res = await fetch(apiUrl(`/api/tickets?${params.toString()}`), {
    method: "GET",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
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

  const res = await fetch(apiUrl(`/api/admin/tickets?${params.toString()}`), {
    method: "GET",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch tickets");
  }
  return data;
};

export const updateTicket = async (id, payload) => {
  const res = await fetch(apiUrl(`/api/admin/tickets/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
    body: JSON.stringify(payload),
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to update ticket");
  }
  return data;
};

export const addTicketMessage = async (id, message, attachment = null) => {
  const body = attachment
    ? (() => {
        const formData = new FormData();
        formData.append("message", message || "");
        formData.append("attachment", attachment);
        return formData;
      })()
    : JSON.stringify({ message });

  const res = await fetch(apiUrl(`/api/tickets/${id}/messages`), {
    method: "POST",
    ...(attachment
      ? { ...defaultFetchOptions, body }
      : {
          headers: { "Content-Type": "application/json" },
          ...defaultFetchOptions,
          body,
        }),
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to send message");
  }
  return data;
};

export const addAdminTicketMessage = async (id, message, attachment = null) => {
  const body = attachment
    ? (() => {
        const formData = new FormData();
        formData.append("message", message || "");
        formData.append("attachment", attachment);
        return formData;
      })()
    : JSON.stringify({ message });

  const res = await fetch(apiUrl(`/api/admin/tickets/${id}/messages`), {
    method: "POST",
    ...(attachment
      ? { ...defaultFetchOptions, body }
      : {
          headers: { "Content-Type": "application/json" },
          ...defaultFetchOptions,
          body,
        }),
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to send message");
  }
  return data;
};

export const markTicketRead = async (id) => {
  const res = await fetch(apiUrl(`/api/tickets/${id}/read`), {
    method: "POST",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to mark ticket as read");
  }
  return data;
};

export const markAdminTicketRead = async (id) => {
  const res = await fetch(apiUrl(`/api/admin/tickets/${id}/read`), {
    method: "POST",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to mark ticket as read");
  }
  return data;
};

export const getTicketUnreadCount = async () => {
  const res = await fetch(apiUrl("/api/tickets/unread-count"), {
    method: "GET",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch unread count");
  }
  return data;
};

export const getAdminTicketUnreadCount = async () => {
  const res = await fetch(apiUrl("/api/admin/tickets/unread-count"), {
    method: "GET",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch unread count");
  }
  return data;
};

export const getTicketMessageAttachmentUrl = async (ticketId, messageIndex) => {
  const res = await fetch(
    apiUrl(
      `/api/tickets/${ticketId}/messages/${messageIndex}/attachment-url`
    ),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to get attachment URL");
  }

  return {
    url: data.url,
    fileName: data.fileName || "attachment",
    contentType: data.contentType || "",
  };
};

export const getTicketAttachmentUrl = async (ticketId) => {
  const res = await fetch(apiUrl(`/api/tickets/${ticketId}/attachment-url`), {
    method: "GET",
    ...defaultFetchOptions,
  });

  const { data } = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.message || "Failed to get attachment URL");
  }

  const url =
    data.legacy && data.url?.startsWith("/")
      ? `${apiUrl("")}${data.url}`
      : data.url;

  return {
    url,
    fileName: data.fileName || "attachment",
  };
};
