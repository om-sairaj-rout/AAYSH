import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { canAccess, isUnrestrictedAdmin } from "./utils/permissions";

const PermissionRoute = ({
  section,
  action = "read",
  redirectTo = "/dashboard",
  children,
}) => {
  const { user } = useSelector((state) => state.auth);

  if (isUnrestrictedAdmin(user) || canAccess(user, section, action)) {
    return children;
  }

  return <Navigate to={redirectTo} replace />;
};

export default PermissionRoute;
