import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { authVerify } from "./store/slice/checkAuth";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import DashBoard from "./pages/DashBoard.jsx";
import Layout from "./components/Layout.jsx"; 
import OrderByDateInfo from "./pages/OrderByDate.jsx";
import RateCalculator from "./pages/RateCalculator.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import TemplatePage from "./pages/TemplatePage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ShipmentPage from "./pages/ShipmentPage.jsx";
import EditAccount from "./pages/EditAccount.jsx";
import RemoveAccount from "./pages/RemoveAccount.jsx";
import AwbManagement from "./pages/AwbManagement.jsx";
import SelectCourier from "./pages/SelectCourier.jsx";
import AwbPage from "./pages/AwbPage.jsx";
import PickupRoute from "./PickupRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import ExcelReportsPage from "./pages/ExcelReportsPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import CustomerTracking from "./pages/CustomerTracking.jsx";
import ServiceabilityPage from "./pages/ServiceabilityPage.jsx";
import CourierPriorityPage from "./pages/CourierPriorityPage.jsx";
import UpdateOrdersPage from "./pages/UpdateOrdersPage.jsx";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password/:token", element: <ResetPassword /> },
  { path: "/track/:awbNumber", element: <CustomerTracking /> },
  {
    element: (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  ), 
    children: [
      { path: "/dashboard", element: <DashBoard /> },
      { path: "/reports/orders", element: <OrderByDateInfo /> },
      { path: "/rate-calculator", element: <RateCalculator /> },
      { path: "/upload/order-reports", element: <UploadPage /> },
      { path: "/upload/template", element: <TemplatePage /> },
      { path: "/upload/excel-reports", element: <ExcelReportsPage /> },
      { path: "/reports/all-orders", element: <OrdersPage /> },
      { path: "/user/create-account", element: <Register /> },
      { path: "/user/edit-account", element: <EditAccount /> },
      { path: "/user/remove-account", element: <RemoveAccount /> },
      { path: "/reports/shipments", element: <ShipmentPage /> },
      { path: "/update/AWB", element: <AwbManagement /> },
      { path: "/update/serviceability", element: <ServiceabilityPage /> },
      { path: "/update/courier-priority", element: <CourierPriorityPage /> },
      { path: "/update/order-updates", element: <UpdateOrdersPage /> },
      { path: "/select-courier", element: <SelectCourier /> },
      { path: "/awb/:awbNumber", element: <AwbPage /> },
      { path: "/pickup", element: <PickupRoute /> },
    ],
  },
]);

const RootWrapper = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(authVerify());
  }, [dispatch]);

  return <RouterProvider router={router} />;
};

export default RootWrapper;