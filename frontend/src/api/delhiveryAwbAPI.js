import { apiUrl } from "./apiBase.js";

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.message || data.error || "Delhivery AWB request failed"
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const fetchDelhiveryAwbPoolStatus = async () => {
  const res = await fetch(apiUrl("/api/delhivery/awb-pool/status"), {
    method: "GET",
    ...defaultFetchOptions,
  });
  return parseJson(res);
};

export const listDelhiveryAwbsAPI = async ({
  status = "all",
  search = "",
  page = 1,
  perPage = 50,
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);

  const res = await fetch(
    apiUrl(`/api/delhivery/awb-pool/awbs?${params.toString()}`),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );
  return parseJson(res);
};

export const bulkFetchDelhiveryAwbsAPI = async (count) => {
  const res = await fetch(apiUrl("/api/delhivery/awb-pool/fetch-bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count: Number(count) }),
    ...defaultFetchOptions,
  });
  return parseJson(res);
};

export const singleFetchDelhiveryAwbAPI = async () => {
  const res = await fetch(apiUrl("/api/delhivery/awb-pool/fetch-single"), {
    method: "POST",
    ...defaultFetchOptions,
  });
  return parseJson(res);
};

export const triggerDelhiveryAwbReplenishAPI = async () => {
  const res = await fetch(apiUrl("/api/delhivery/awb-pool/replenish-now"), {
    method: "POST",
    ...defaultFetchOptions,
  });
  return parseJson(res);
};
