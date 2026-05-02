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

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <Layout />, 
    children: [
      { path: "/dashboard", element: <DashBoard /> },
      { path: "/booking-info", element: <BookingInfo /> },
      { path: "/rate-calculator", element: <RateCalculator /> },
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