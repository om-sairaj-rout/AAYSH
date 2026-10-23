/**
 * API origin for fetch calls. In local dev, defaults to Express on port 3000
 * when VITE_API_URL is not set (create frontend/.env for production builds).
 */
export const getApiBase = () => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "http://localhost:3000";
  }
  return "";
};
