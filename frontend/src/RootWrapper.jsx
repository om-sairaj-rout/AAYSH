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
import RegistrationOverviewPage from "./pages/RegistrationOverviewPage.jsx";
import CompanyDetailPage from "./pages/CompanyDetailPage.jsx";
import CompanyTeamPage from "./pages/CompanyTeamPage.jsx";
import ProductCatalogPage from "./pages/ProductCatalogPage.jsx";
import ReversePickupRoute from "./ReversePickupRoute.jsx";
import SupportTicketsPage from "./pages/SupportTicketsPage.jsx";
import AdminTicketsRoute from "./AdminTicketsRoute.jsx";
import PathPermissionRoute from "./PathPermissionRoute.jsx";

const guard = (path, element, action = "read") => (
  <PathPermissionRoute path={path} action={action}>
    {element}
  </PathPermissionRoute>
);

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
      { path: "/dashboard", element: guard("/dashboard", <DashBoard />) },
      { path: "/reports/orders", element: guard("/reports/orders", <OrderByDateInfo />) },
      { path: "/rate-calculator", element: guard("/rate-calculator", <RateCalculator />) },
      { path: "/upload/order-reports", element: guard("/upload/order-reports", <UploadPage />) },
      { path: "/upload/template", element: guard("/upload/template", <TemplatePage />) },
      { path: "/update/status", element: guard("/update/status", <ExcelReportsPage />) },
      { path: "/reports/all-orders", element: guard("/reports/all-orders", <OrdersPage />) },
      {
        path: "/select-courier",
        element: guard("/select-courier", <SelectCourier />, "write"),
      },
      { path: "/catalog/products", element: guard("/catalog/products", <ProductCatalogPage />) },
      { path: "/user/create-account", element: guard("/user/create-account", <Register />, "write") },
      { path: "/user/registrations", element: guard("/user/registrations", <RegistrationOverviewPage />) },
      { path: "/user/companies/:companyID", element: guard("/user/companies", <CompanyDetailPage />) },
      { path: "/company/team", element: guard("/company/team", <CompanyTeamPage />) },
      { path: "/user/edit-account", element: guard("/user/edit-account", <EditAccount />) },
      { path: "/user/remove-account", element: guard("/user/remove-account", <RemoveAccount />, "write") },
      { path: "/update/AWB", element: guard("/update/AWB", <AwbManagement />) },
      { path: "/update/serviceability", element: guard("/update/serviceability", <ServiceabilityPage />) },
      { path: "/update/courier-priority", element: guard("/update/courier-priority", <CourierPriorityPage />) },
      { path: "/update/order-updates", element: guard("/update/order-updates", <UpdateOrdersPage />) },
      { path: "/awb/:awbNumber", element: guard("/awb", <AwbPage />) },
      { path: "/pickup", element: guard("/pickup", <PickupRoute />) },
      { path: "/pickup/reverse", element: guard("/pickup/reverse", <ReversePickupRoute />) },
      { path: "/contact", element: guard("/contact", <SupportTicketsPage />) },
      { path: "/admin/tickets", element: <AdminTicketsRoute /> },
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
