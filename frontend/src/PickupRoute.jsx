import { useSelector } from "react-redux";
import { hasGlobalDataAccess } from "./utils/permissions";

import AdminPickupPage from "./pages/AdminPickupPage";
import UserPickupPage from "./pages/UserPickupPage";

const PickupRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (hasGlobalDataAccess(user)) {
    return <AdminPickupPage />;
  }

  return <UserPickupPage />;
};

export default PickupRoute;
