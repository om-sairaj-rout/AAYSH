const BASE = import.meta.env.VITE_API_URL;

// ================= GET ORDERS BY USER =================
export const getOrdersByUser = async (userId) => {

  const res = await fetch(
    `${BASE}/api/admin/orders/${userId}`,
    {
      credentials: "include"
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;
};


// ================= UPDATE ORDER =================
export const updateOrderWeightAndStatus = async (
  orderId,
  payload
) => {

  const res = await fetch(
    `${BASE}/api/admin/order/${orderId}`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;
};