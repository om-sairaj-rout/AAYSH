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