import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector(
    (state) => state.auth
  );

  // Only block the UI during the first auth check, not on later re-verifications
  if (!loading && isAuthenticated === null) {
    return <Navigate to="/login" replace />;
  }

  if (loading && isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;