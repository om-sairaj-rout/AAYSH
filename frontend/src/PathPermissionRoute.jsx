import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { canAccess, canViewPath, getSectionForPath } from "./utils/permissions";

/**
 * Guards a route by pathname → permission section mapping.
 * @param {string} path - Route path used for section lookup (e.g. "/reports/orders")
 * @param {"read"|"write"} action - Required permission level (default read)
 */
const PathPermissionRoute = ({
  path,
  action = "read",
  redirectTo = "/dashboard",
  children,
}) => {
  const { user } = useSelector((state) => state.auth);
  const section = getSectionForPath(path);

  if (!section) {
    return children;
  }

  const allowed =
    action === "write"
      ? canAccess(user, section, "write")
      : canViewPath(user, path);

  if (allowed) {
    return children;
  }

  return <Navigate to={redirectTo} replace />;
};

export default PathPermissionRoute;
