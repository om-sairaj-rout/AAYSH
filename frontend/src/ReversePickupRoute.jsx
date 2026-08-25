import { useSelector } from "react-redux";
import { hasGlobalDataAccess } from "./utils/permissions";
import ReversePickupPage from "./pages/ReversePickupPage";
import AdminReversePickupPage from "./pages/AdminReversePickupPage";

const ReversePickupRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (hasGlobalDataAccess(user)) {
    return <AdminReversePickupPage />;
  }

  return <ReversePickupPage />;
};

export default ReversePickupRoute;
