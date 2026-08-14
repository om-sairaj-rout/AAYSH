const BASE = import.meta.env.VITE_API_URL;

export const getCompanies = async () => {
  const res = await fetch(`${BASE}/api/companies`, {
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

export const getCompanyDetail = async (companyID) => {
  const res = await fetch(`${BASE}/api/companies/${companyID}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch company details");
  }
  return data;
};

export const registerCompanyUser = async (companyID, payload) => {
  const res = await fetch(`${BASE}/api/companies/${companyID}/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to register company user");
  }
  return data;
};

export const updateCompanyUser = async (companyID, userId, payload) => {
  const res = await fetch(`${BASE}/api/companies/${companyID}/users/${userId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update company user");
  }
  return data;
};

export const deleteCompanyUser = async (companyID, userId) => {
  const res = await fetch(`${BASE}/api/companies/${companyID}/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to remove company user");
  }
  return data;
};
