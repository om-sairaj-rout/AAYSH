const BASE = import.meta.env.VITE_API_URL;

export const getDashboardData = async ({
  year,
  view = "month",
  month,
  week,
  companyId,
  from,
  to,
} = {}) => {
  const params = new URLSearchParams({ year: String(year) });

  if (view === "week") {
    params.set("view", "week");
    if (month) params.set("month", String(month));
    if (week) params.set("week", String(week));
  }

  if (companyId && companyId !== "ALL") {
    params.set("companyId", companyId);
  }
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await fetch(`${BASE}/api/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch dashboard data");
  }

  return data;
};