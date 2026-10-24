/**
 * API origin for fetch calls. In local dev, defaults to Express on port 3000
 * when VITE_API_URL is not set (create frontend/.env for production builds).
 */
export const getApiBase = () => {
  const fromEnv = import.meta.env.VITE_API_URL;
  let base = fromEnv && String(fromEnv).trim() ? String(fromEnv).trim() : "";

  if (!base && import.meta.env.DEV) {
    base = "http://localhost:3000";
  }

  if (!base) {
    return "";
  }

  base = base.replace(/\/$/, "");
  if (base.endsWith("/api")) {
    base = base.slice(0, -4);
  }
  return base;
};

export const apiUrl = (path) => {
  const base = getApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
