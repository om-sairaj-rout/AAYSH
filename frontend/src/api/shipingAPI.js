const BASE = import.meta.env.VITE_API_URL;

export const shipOrdersAPI  = async (payload) => {
  const res = await fetch(`${BASE}/api/shipping/assign-awb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return res.json();
};