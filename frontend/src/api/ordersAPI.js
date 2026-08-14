const BASE = import.meta.env.VITE_API_URL;

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
      credentials: "include",
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
  paymentMethod,
  pickupLocation,
  courierName,
  forShipments,
  bookedTab,
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

  const res = await fetch(
    `${BASE}/api/orders?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
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
  const res = await fetch(
    `${BASE}/api/orders/awb/${awbNumber}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch AWB");
  }

  return data;
};

export const getPublicOrderByAwb = async (awbNumber) => {
  const res = await fetch(
    `${BASE}/api/public/orders/awb/${awbNumber}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
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