import { useSelector } from "react-redux";

import AdminPickupPage from "./pages/AdminPickupPage";
import UserPickupPage from "./pages/UserPickupPage";

const PickupRoute = () => {
  const { isAdmin } = useSelector((state) => state.auth);

  if (isAdmin) {
    return <AdminPickupPage />;
  }

  return <UserPickupPage />;
};

export default PickupRoute;