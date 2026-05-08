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