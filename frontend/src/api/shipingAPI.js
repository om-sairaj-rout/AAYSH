const BASE = import.meta.env.VITE_API_URL;

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

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

const buildPickupParams = ({
  page = 1,
  perPage = 20,
  tab,
  search,
  userId,
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (tab) {
    params.append("tab", tab);
  }

  if (search) {
    params.append("search", search);
  }

  if (userId && userId !== "ALL") {
    params.append("user_id", userId);
  }

  return params;
};

export const pickupOrdersAPI = async (options = {}) => {
  const params = buildPickupParams(options);

  const res = await fetch(`${BASE}/api/user/pickups?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
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

export const cancelPickupAPI = async (pickupId) => {
  const res = await fetch(`${BASE}/api/user/pickups/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ pickupId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;
};

export const getAdminPickupsAPI = async (options = {}) => {
  const params = buildPickupParams(options);

  const res = await fetch(`${BASE}/api/admin/pickups?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...defaultFetchOptions,
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message);

  return data;
};

export const completePickupAPI = async (pickupId) => {
  const res = await fetch(`${BASE}/api/admin/pickups/complete`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ pickupId }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message);

  return data;
};

export const failPickupAPI = async (pickupId, failureReason) => {
  const res = await fetch(`${BASE}/api/admin/pickups/fail`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      pickupId,
      failureReason,
    }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message);

  return data;
};