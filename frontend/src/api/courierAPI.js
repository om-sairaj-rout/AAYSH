const BASE = import.meta.env.VITE_API_URL;

export const fetchCourierPartnersAPI = async () => {
  const res = await fetch(`${BASE}/api/courier/all`,{
    method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
  });
  return res.json();
};

export const getCourierPriorityAPI = async (service) => {
  const res = await fetch(`${BASE}/api/priority/${service}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return res.json();
};

export const updateCourierPriorityAPI = async (service, priority) => {
  const res = await fetch(`${BASE}/api/priority/${service}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ priority }),
  });
  return res.json();
};

export const addCourierPartnerAPI = async (name) => {
  const res = await fetch(`${BASE}/api/courier/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name })
  });
  return res.json();
};

export const uploadAwbSheetAPI = async (formData) => {
  const res = await fetch(`${BASE}/api/awb/upload`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  return res.json();
};

export const uploadServiceabilitySheetAPI = async (formData) => {
  const res = await fetch(`${BASE}/api/serviceability/upload`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  return res.json();
};

const jsonRequest = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const updateCourierPartnerAPI = async (courierId, payload) =>
  jsonRequest(`${BASE}/api/courier/${courierId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteCourierPartnerAPI = async (courierId) =>
  jsonRequest(`${BASE}/api/courier/${courierId}`, {
    method: "DELETE",
  });

export const fetchCourierAwbsAPI = async (courierId, category) => {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  return jsonRequest(`${BASE}/api/courier/${courierId}/awbs${params}`);
};

export const updateAwbAPI = async (awbId, payload) =>
  jsonRequest(`${BASE}/api/awb/${awbId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteAwbAPI = async (awbId) =>
  jsonRequest(`${BASE}/api/awb/${awbId}`, {
    method: "DELETE",
  });
