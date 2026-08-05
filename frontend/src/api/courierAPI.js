const BASE = import.meta.env.VITE_API_URL;

export const fetchCourierPartnersAPI = async () => {
  const res = await fetch(`${BASE}/api/courier/all`,{
    method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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