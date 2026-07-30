const BASE = import.meta.env.VITE_API_URL;

export const getOrdersByDate = async (fromDate, toDate) => {

  const res = await fetch(
    `${BASE}/api/orders/filter?fromDate=${fromDate}&toDate=${toDate}`,
    {
      method: "GET",
      credentials: "include"
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

export const getOrders = async (
  status,
  from,
  to,
  search,
  paymentMethod,
  pickupLocation,
  courierName
) => {
  const params = new URLSearchParams();

  if (status) {
    params.append("status", status);
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