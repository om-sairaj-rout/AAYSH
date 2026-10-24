import { apiUrl } from "./apiBase.js";

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export const getSecureOrderByAwb = async (awbNumber) => {
  const trimmed = String(awbNumber || "").trim();
  const res = await fetch(apiUrl(`/api/orders/awb/${encodeURIComponent(trimmed)}/secure`), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Unable to load tracking details");
  }
  return data;
};

export const getShipmentPodDownloadUrl = async (awbNumber) => {
  const trimmed = String(awbNumber || "").trim();
  const res = await fetch(
    apiUrl(`/api/shipments/awb/${encodeURIComponent(trimmed)}/pod/download-url`),
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "POD is not available");
  }
  return data;
};

export const uploadShipmentPodAdmin = async (awbNumber, file) => {
  const trimmed = String(awbNumber || "").trim();
  const formData = new FormData();
  formData.append("pod", file);

  const res = await fetch(
    apiUrl(`/api/admin/shipments/awb/${encodeURIComponent(trimmed)}/pod`),
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "POD upload failed");
  }
  return data;
};
