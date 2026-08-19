const BASE = import.meta.env.VITE_API_URL;

const defaultFetchOptions = {
  credentials: "include",
  cache: "no-store",
};

export const getOrdersByDate = async (
  fromDate,
  toDate,
  { page = 1, perPage = 20, all = false } = {}
) => {
  const params = new URLSearchParams({
    fromDate,
    toDate,
    page: String(page),
    per_page: String(perPage),
  });

  if (all) {
    params.append("all", "true");
  }

  const res = await fetch(
    `${BASE}/api/orders/filter?${params.toString()}`,
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  if (!res.ok) {
    const errorData = await res.json();

    throw new Error(
      errorData.message || "Failed to fetch orders"
    );
  }

  return res.json();
};

export const getOrders = async ({
  status,
  statuses,
  from,
  to,
  search,
  searchType,
  paymentMethod,
  pickupLocation,
  courierName,
  forShipments,
  bookedTab,
  companyId,
  page = 1,
  perPage = 20,
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (status) {
    params.append("status", status);
  }

  if (statuses) {
    params.append("statuses", statuses);
  }

  if (from) {
    params.append("from", from);
  }

  if (to) {
    params.append("to", to);
  }

  if (search) {
    params.append("search", search);
  }

  if (searchType) {
    params.append("search_type", searchType);
  }

  if (paymentMethod) {
    params.append("payment_method", paymentMethod);
  }

  if (pickupLocation) {
    params.append("pickup_location", pickupLocation);
  }

  if (courierName) {
    params.append("courier_name", courierName);
  }

  if (forShipments) {
    params.append("for_shipments", "true");
  }

  if (bookedTab) {
    params.append("booked_tab", bookedTab);
  }

  if (companyId && companyId !== "ALL") {
    params.append("company_id", companyId);
  }

  const res = await fetch(
    `${BASE}/api/orders?${params.toString()}`,
    {
      method: "GET",
      ...defaultFetchOptions,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to fetch orders"
    );
  }

  return data;
};

export const getOrderByAwb = async (awbNumber) => {
  const encoded = encodeURIComponent(String(awbNumber).trim());
  const res = await fetch(
    `${BASE}/api/orders/awb/${encoded}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch AWB");
  }

  return data;
};

export const getPublicOrderByAwb = async (awbNumber) => {
  const encoded = encodeURIComponent(String(awbNumber).trim());
  const res = await fetch(
    `${BASE}/api/public/orders/awb/${encoded}`,
    { cache: "no-store" }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch AWB");
  }

  return data;
};

export const getOrdersByUser = async (userId) => {
  try {
    const response = await fetch(
      `${BASE}/api/users/${userId}/orders`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch orders");
    }

    return data;
  } catch (error) {
    console.error("Get orders by user error:", error);
    throw error;
  }
};

export const updateOrder = async (formData) => {
  try {
    const response = await fetch(
      `${BASE}/api/external/orders/update-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to update order"
      );
    }

    return data;
  } catch (error) {
    console.error("Update order error:", error);
    throw error;
  }
};

export const createOrder = async (payload) => {
  const res = await fetch(`${BASE}/api/external/orders/create-order`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Failed to create order");
  }

  return data;
};

export const getOrderIdSequences = async () => {
  const res = await fetch(`${BASE}/api/external/orders/order-id-sequences`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch order ID sequences");
  }
  return data;
};

export const getNextOrderId = async ({ sequence = "alphanumeric", companyId } = {}) => {
  const params = new URLSearchParams({ sequence });
  if (companyId) {
    params.set("companyId", companyId);
  }

  const res = await fetch(
    `${BASE}/api/external/orders/next-order-id?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch next order ID");
  }
  return data;
};