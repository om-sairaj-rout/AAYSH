const BASE = import.meta.env.VITE_API_URL;

export const uploadFile = async (file) => {

    const formData = new FormData();

    formData.append('file', file);

    const res = await fetch(`${BASE}/api/upload`, {

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

export const uploadAndUpdateStatusExcel = async (userId, formData) => {
  const res = await fetch(
    `${BASE}/api/upload-status-excel/${userId}`,
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