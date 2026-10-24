import { apiUrl, getApiBase } from "./apiBase.js";

const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    if (Array.isArray(data.errors)) {
      err.errors = data.errors;
    }
    throw err;
  }
  return data;
};

export const previewBillingInvoiceAPI = async ({
  companyID,
  awbText,
  awbNumbers,
  invoice,
  recalculateRates = false,
}) => {
  const res = await fetch(apiUrl(`/api/billing/invoice/preview`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyID,
      awbText,
      awbNumbers,
      invoice,
      recalculateRates,
    }),
  });
  return parseResponse(res);
};

export const previewBillingInvoiceFromExcelAPI = async (companyID, file) => {
  const formData = new FormData();
  formData.append("companyID", companyID);
  formData.append("file", file);

  const res = await fetch(apiUrl(`/api/billing/invoice/preview-excel`), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return parseResponse(res);
};

const downloadBlob = async (url, payload, filenameFallback) => {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Export failed";
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || filenameFallback;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const exportBillingInvoicePdfAPI = async (payload) =>
  downloadBlob(
    apiUrl(`/api/billing/invoice/export/pdf`),
    payload,
    "tax-invoice.pdf"
  );

export const exportBillingInvoiceExcelAPI = async (payload) =>
  downloadBlob(
    apiUrl(`/api/billing/invoice/export/excel`),
    payload,
    "tax-invoice.xlsx"
  );

export const saveBillingInvoiceAPI = async (payload) => {
  const res = await fetch(apiUrl(`/api/billing/invoice/save`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to save invoice");
  }
  return data;
};

export const listBillingInvoiceHistoryAPI = async (month) => {
  const res = await fetch(
    apiUrl(`/api/billing/invoice/history?month=${encodeURIComponent(month)}`),
    {
      method: "GET",
      credentials: "include",
    }
  );
  return parseResponse(res);
};

const downloadHistoryBlob = async (url, filenameFallback) => {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    let message = "Download failed";
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || filenameFallback;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const downloadSavedBillingInvoicePdfAPI = async (id) =>
  downloadHistoryBlob(
    apiUrl(`/api/billing/invoice/history/${id}/pdf`),
    "tax-invoice.pdf"
  );

export const downloadSavedBillingInvoiceExcelAPI = async (id) =>
  downloadHistoryBlob(
    apiUrl(`/api/billing/invoice/history/${id}/excel`),
    "tax-invoice.xlsx"
  );

export const deleteSavedBillingInvoiceAPI = async (id) => {
  const res = await fetch(apiUrl(`/api/billing/invoice/history/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to delete saved invoice");
  }
  return data;
};
