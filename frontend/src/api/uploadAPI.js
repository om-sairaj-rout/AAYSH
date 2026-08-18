const BASE = import.meta.env.VITE_API_URL;

export const uploadFile = async (file) => {

    const formData = new FormData();

    formData.append('file', file);

    const res = await fetch(`${BASE}/api/external/upload`, {

        method: "POST",

        body: formData,

        credentials: 'include',

    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Upload failed");
    }

    return data;
};

export const getUploadHistory = async () => {

    const res = await fetch(`${BASE}/api/upload/history`, {

        method: "GET",

        credentials: 'include',

    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to fetch history");
    }

    return data;
};

export const deleteUploadRecord = async (id) => {

    const res = await fetch(`${BASE}/api/upload/history/${id}`, {

        method: "DELETE",

        credentials: 'include',

    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to delete record");
    }

    return data;
};

export const getStatusUpdateCompanies = async () => {
  const res = await fetch(`${BASE}/api/status-update/companies`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch companies");
  }
  return data;
};

export const downloadCompanyOrdersExcel = async (companyID) => {
  const res = await fetch(
    `${BASE}/api/download-company-orders/${encodeURIComponent(companyID)}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Download failed");
  }

  return res.blob();
};

export const downloadUserOrdersExcel =
  async (userId) => {

  const res = await fetch(
    `${BASE}/api/download-user-orders/${userId}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error(
      "Download failed"
    );
  }

  return res.blob();
};

export const uploadAndUpdateStatusExcel = async (companyID, formData) => {
  const res = await fetch(
    `${BASE}/api/upload-status-excel/${encodeURIComponent(companyID)}`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
      headers: {
        // IMPORTANT: DO NOT manually set boundary, browser handles it
        Accept: "application/json",
      },
    }
  );

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error("Invalid server response");
  }

  if (!res.ok) {
    throw new Error(data.message || "Upload failed");
  }

  return data;
};