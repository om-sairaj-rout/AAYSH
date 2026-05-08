import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { authVerify } from "./store/slice/checkAuth";

import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import DashBoard from "./pages/DashBoard.jsx";
import Layout from "./components/Layout.jsx"; 
import BookingInfo from "./pages/BookingInfo.jsx";
import RateCalculator from "./pages/RateCalculator.jsx";
import UploadPage from "./pages/UploadPage.jsx";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/login", element: <Login /> },
  {
    element: <Layout />, 
    children: [
      { path: "/dashboard", element: <DashBoard /> },
      { path: "/reports/orders", element: <BookingInfo /> },
      { path: "/rate-calculator", element: <RateCalculator /> },
      { path: "/reports/upload", element: <UploadPage /> },
      { path: "/settings/create-account", element: <Register /> },
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