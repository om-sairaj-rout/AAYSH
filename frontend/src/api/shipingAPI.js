const BASE = import.meta.env.VITE_API_URL;

export const shipOrdersAPI  = async (payload) => {
  const res = await fetch(`${BASE}/api/shipping/assign-awb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
      throw new Error(data.message);
  }

  return data;
};

export const pickupOrdersAPI  = async () => {
  const res = await fetch(`${BASE}/api/user/pickups`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
      throw new Error(data.message);
  }

  return data;
};

export const reschedulePickupAPI = async (payload) => {
  const res = await fetch(`${BASE}/api/user/pickups/reschedule`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;
};