const BASE = import.meta.env.VITE_API_URL;

export const getDashboardData = async () => {

    const res = await fetch(
      `${BASE}/api/dashboard`,
      {
        method: "GET",
        credentials: "include"
      }
    );

    const data = await res.json();

    if (!res.ok) {

      throw new Error(
        data.message || "Failed to fetch dashboard data"
      );
    }

    return data;
};