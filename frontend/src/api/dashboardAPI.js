const BASE = import.meta.env.VITE_API_URL;

export const getDashboardData = async (year) => {
  const res = await fetch(
    `${BASE}/api/dashboard?year=${year}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch dashboard data");
  }

  return data;
};