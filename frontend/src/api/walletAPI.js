import { getApiBase } from "./apiBase";

const BASE = getApiBase();

const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const getWalletOverviewAPI = async (companyID) => {
  const query = companyID ? `?companyID=${encodeURIComponent(companyID)}` : "";
  const res = await fetch(`${BASE}/api/wallet${query}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const getWalletTransactionsAPI = async ({
  companyID,
  page = 1,
  limit = 25,
  type,
  fromDate,
  toDate,
  awb,
  search,
}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (companyID) params.set("companyID", companyID);
  if (type) params.set("type", type);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  if (awb) params.set("awb", awb);
  if (search) params.set("search", search);
  const res = await fetch(`${BASE}/api/wallet/transactions?${params}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const getWalletRechargesAPI = async ({
  companyID,
  page = 1,
  limit = 25,
  fromDate,
  toDate,
  search,
}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (companyID) params.set("companyID", companyID);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  if (search) params.set("search", search);
  const res = await fetch(`${BASE}/api/wallet/recharges?${params}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse(res);
};

export const initiateWalletRechargeAPI = async ({ amount, notes, companyID }) => {
  const res = await fetch(`${BASE}/api/wallet/recharges`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, notes, companyID }),
  });
  return parseResponse(res);
};

export const verifyWalletRechargeAPI = async ({
  rechargeId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  companyID,
}) => {
  const res = await fetch(`${BASE}/api/wallet/recharges/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rechargeId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      companyID,
    }),
  });
  return parseResponse(res);
};

export const cancelWalletRechargeAPI = async ({ rechargeId, companyID }) => {
  const res = await fetch(`${BASE}/api/wallet/recharges/cancel`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rechargeId, companyID }),
  });
  return parseResponse(res);
};

export const adminAdjustWalletAPI = async (payload) => {
  const res = await fetch(`${BASE}/api/wallet/admin/adjust`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
};

export const updateCompanyWalletSettingAPI = async (companyID, walletEnabled) => {
  const res = await fetch(`${BASE}/api/companies/${companyID}/wallet-settings`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletEnabled }),
  });
  return parseResponse(res);
};
