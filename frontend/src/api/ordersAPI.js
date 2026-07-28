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

export const getOrders = async ({ status, role, userId }) => {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/orders?status=${status}&role=${role}&userId=${userId}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await res.json();

  if (!res.ok) {
      throw new Error(data.message);
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