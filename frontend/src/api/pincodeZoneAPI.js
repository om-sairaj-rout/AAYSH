import { apiUrl } from "./apiBase.js";
import { parseJsonResponse } from "./jsonResponse.js";

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export const getPincodeZoneSummary = async () => {
  const res = await fetch(apiUrl("/api/admin/pincode-zones/summary"), {
    method: "GET",
    ...defaultFetchOptions,
  });
  const { data } = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to load zone summary");
  return data;
};

const postPincodeZoneFile = async (path, { zone, file, columnIndex, confirm }) => {
  const formData = new FormData();
  formData.append("zone", zone);
  formData.append("file", file);
  if (columnIndex !== undefined && columnIndex !== null && columnIndex !== "") {
    formData.append("pincodeColumnIndex", String(columnIndex));
  }
  if (confirm) formData.append("confirm", "true");

  const res = await fetch(apiUrl(path), {
    method: "POST",
    ...defaultFetchOptions,
    body: formData,
  });
  const { data } = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Pincode zone request failed");
  return data;
};

export const previewPincodeZoneImport = (payload) =>
  postPincodeZoneFile("/api/admin/pincode-zones/preview", payload);

export const importPincodeZone = (payload) =>
  postPincodeZoneFile("/api/admin/pincode-zones/import", { ...payload, confirm: true });
