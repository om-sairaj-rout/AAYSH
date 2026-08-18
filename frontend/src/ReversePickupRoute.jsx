import { useSelector } from "react-redux";
import ReversePickupPage from "./pages/ReversePickupPage";
import AdminReversePickupPage from "./pages/AdminReversePickupPage";

const ReversePickupRoute = () => {
  const { isAdmin } = useSelector((state) => state.auth);

  if (isAdmin) {
    return <AdminReversePickupPage />;
  }

  return <ReversePickupPage />;
};

export default ReversePickupRoute;
