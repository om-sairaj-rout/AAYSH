import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminTicketsPage from "./pages/AdminTicketsPage";

const AdminTicketsRoute = () => {
  const { isAdmin } = useSelector((state) => state.auth);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminTicketsPage />;
};

export default AdminTicketsRoute;
