const BASE = import.meta.env.VITE_API_URL;

const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const RATE_ZONES = [
  "Local NCR",
  "North Zone",
  "Metro",
  "Rest of India",
  "North East",
];

export const RATE_SERVICES = [
  { id: "surface", label: "SUR (Surface)" },
  { id: "air", label: "AIR" },
  { id: "prime", label: "PRIME" },
];

export const getAllRateStructuresAPI = async () => {
  const res = await fetch(`${BASE}/api/rates`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const getRateStructureAPI = async (service) => {
  const res = await fetch(`${BASE}/api/rates/${service}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const updateRateStructureAPI = async (service, slabs) => {
  const res = await fetch(`${BASE}/api/rates/${service}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slabs }),
  });
  return parseResponse(res);
};

export const calculateRateAPI = async (payload) => {
  const res = await fetch(`${BASE}/api/rates/calculate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
};

export const lookupPincodeZoneAPI = async (pincode) => {
  const res = await fetch(`${BASE}/api/rates/pincode/${pincode}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const getCompanyRateProfileAPI = async (companyID) => {
  const res = await fetch(`${BASE}/api/rates/company/${companyID}/profile`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const updateCompanyRateProfileAPI = async (companyID, profile) => {
  const res = await fetch(`${BASE}/api/rates/company/${companyID}/profile`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return parseResponse(res);
};

export const getCompanyRateStructureAPI = async (companyID, service) => {
  const res = await fetch(`${BASE}/api/rates/company/${companyID}/${service}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const updateCompanyRateStructureAPI = async (companyID, service, slabs) => {
  const res = await fetch(`${BASE}/api/rates/company/${companyID}/${service}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slabs }),
  });
  return parseResponse(res);
};

export const buildEmptySlab = (sortOrder = 0) => ({
  name: "",
  minWeight: 0,
  maxWeight: null,
  baseWeight: 0,
  incrementStep: 0,
  zoneRates: RATE_ZONES.reduce((acc, zone) => {
    acc[zone] = { baseRate: 0, incrementRate: 0 };
    return acc;
  }, {}),
  sortOrder,
  isActive: true,
});
