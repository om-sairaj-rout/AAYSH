import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RootWrapper from "./RootWrapper.jsx";
import { Provider } from "react-redux";
import store from "./store/store.js";
import { Toaster } from "react-hot-toast";
import { ConfirmProvider } from "./components/ConfirmDialog.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <ConfirmProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={12}
          containerStyle={{ top: 16, right: 16 }}
          toastOptions={{
            duration: 4000,
            className: "text-sm font-medium",
            style: {
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#1e293b",
              boxShadow:
                "0 10px 30px -12px rgba(15, 23, 42, 0.25), 0 4px 10px -6px rgba(15, 23, 42, 0.12)",
              padding: "12px 14px",
              maxWidth: "380px",
            },
            success: {
              duration: 3500,
              iconTheme: {
                primary: "#059669",
                secondary: "#ecfdf5",
              },
              style: {
                borderColor: "#a7f3d0",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#e11d48",
                secondary: "#fff1f2",
              },
              style: {
                borderColor: "#fecdd3",
              },
            },
            loading: {
              iconTheme: {
                primary: "#4f46e5",
                secondary: "#eef2ff",
              },
              style: {
                borderColor: "#c7d2fe",
              },
            },
          }}
        />
        <RootWrapper />
      </ConfirmProvider>
    </Provider>
  </StrictMode>
);
