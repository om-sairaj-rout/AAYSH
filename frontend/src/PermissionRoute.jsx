import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { canAccess } from "./utils/permissions";

const PermissionRoute = ({
  section,
  action = "read",
  redirectTo = "/dashboard",
  children,
}) => {
  const { user, isAdmin } = useSelector((state) => state.auth);

  if (isAdmin || canAccess(user, section, action)) {
    return children;
  }

  return <Navigate to={redirectTo} replace />;
};

export default PermissionRoute;
