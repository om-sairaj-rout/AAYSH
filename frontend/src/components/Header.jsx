import { Search, Calculator, UserCircle, LogOut, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../api/authAPI";
import { logout } from "../store/slice/checkAuth";
import { getOrderByAwb } from "../api/ordersAPI";
import { toast } from "react-hot-toast";

const Header = ({ setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);

  const [showLogout, setShowLogout] = useState(false);
  const [search, setSearch] = useState("");

  const titles = {
    "/dashboard": "Dashboard",
    "/reports/orders": "Order Report",
    "/upload/order-reports": "Upload Report",
    "/upload/template": "Excel Template",
    "/reports/all-orders": "Orders",
    "/user/create-account": "Create User Account",
    "/rate-calculator": "Rate Calculator",
    "/reports/shipments": "Shipments",
    "/user/edit-account": "Edit User Profile",
    "/user/remove-account": "Remove User Account",
    "/update/AWB": "AWB Management",
    "/update/status": "Status Management",
    "/awb/:awbNumber": "AWB Information",
    "/upload/excel-reports": "Excel Reports",
  };

  const currentTitle = titles[location.pathname] || "Aaysh Express";

  const handleLogout = async () => {
    try {
      await logoutUser();
      dispatch(logout());
      setShowLogout(false);
      navigate("/home");
    } catch (err) {
      dispatch(logout());
      navigate("/login");
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      const res = await getOrderByAwb(search.trim());

      if (res?.success && res?.order) {
        navigate(`/awb/${search.trim()}`);
        setSearch("");
      } else {
        toast.error("No such AWB number found");
      }
    } catch (err) {
      toast.error("Server error while searching AWB");
    }
  };

  return (
    <header className="sticky top-0 w-full h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-30">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu trigger button (visible only on mobile/tablet) */}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800 truncate max-w-[180px] sm:max-w-none">
          {currentTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end sm:flex-initial">
        {/* Responsive Search Bar container */}
        <div className="relative w-full max-w-[160px] sm:max-w-[240px] md:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search AWB..."
            className="pl-9 pr-3 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 border rounded-lg w-full text-xs md:text-sm outline-none transition-all"
          />
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
            size={16}
            onClick={handleSearch}
          />
        </div>

        {/* Action Icons Panel */}
        <div className="flex items-center gap-1 md:gap-2 border-l pl-2 md:pl-4 border-gray-200 relative">
          {/* <button
            onClick={() => navigate("/rate-calculator")}
            className={`hidden sm:block p-2 rounded-full transition-colors ${
              location.pathname === "/rate-calculator"
                ? "bg-teal-50 text-teal-600"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <Calculator size={20} />
          </button> */}

          {/* Profile Dropdown Component */}
          <div className="relative">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className={`flex items-center gap-2 p-1 rounded-full transition-all ${showLogout ? "bg-gray-100 shadow-inner" : "hover:bg-gray-100"}`}
            >
              <UserCircle size={28} className="text-blue-500" />
            </button>

            {showLogout && (
              <>
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowLogout(false)}
                />

                <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in duration-150">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Logged in as
                    </p>
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {user?.companyName || "User"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold"
                  >
                    <LogOut size={16} />
                    Logout Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;