import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminTicketsPage from "./pages/AdminTicketsPage";
import { canViewPath } from "./utils/permissions";

const AdminTicketsRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (!canViewPath(user, "/admin/tickets")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminTicketsPage />;
};

export default AdminTicketsRoute;
