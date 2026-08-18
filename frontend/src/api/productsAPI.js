const BASE = import.meta.env.VITE_API_URL;

export const getProducts = async ({ search, companyId } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (companyId && companyId !== "ALL") params.set("companyId", companyId);

  const res = await fetch(`${BASE}/api/products?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch products");
  }
  return data;
};

export const createProduct = async (payload) => {
  const res = await fetch(`${BASE}/api/products`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to create product");
  }
  return data;
};

export const updateProduct = async (id, payload) => {
  const res = await fetch(`${BASE}/api/products/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update product");
  }
  return data;
};

export const deleteProduct = async (id) => {
  const res = await fetch(`${BASE}/api/products/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to delete product");
  }
  return data;
};
