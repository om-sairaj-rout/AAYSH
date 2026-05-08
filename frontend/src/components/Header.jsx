import { Search, Calculator, UserCircle, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux"; // Added for Redux
import { logoutUser } from "../api/authAPI"; // Import your API utility
import { logout } from "../store/slice/checkAuth"; // Import your slice action

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch(); // Initialize dispatch
  
  // Get user details from Redux to show in the dropdown
  const { user } = useSelector((state) => state.auth);
  
  const [showLogout, setShowLogout] = useState(false);

  const titles = {
    "/dashboard": "Dashboard",
    "/reports/orders": "Order Report",
    "/reports/upload": "Upload Report",
    "/settings/create-account": "Create User Account",
    "/rate-calculator": "Rate Calculator"
  };

  const currentTitle = titles[location.pathname] || "Aaysh Express";

  // Updated handleLogout to handle API and Redux
  const handleLogout = async () => {
    try {
      // 1. Call the backend API to clear cookies
      await logoutUser();
      
      // 2. Clear the Redux state (initialState reset)
      dispatch(logout());
      
      // 3. Close dropdown and redirect
      setShowLogout(false);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err.message);
      // Even if API fails, clear local state to protect the UI
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 w-full h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-50">
      <h1 className="text-2xl font-semibold text-gray-800">{currentTitle}</h1>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Order By AWB Number & Order Id" 
            className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 border rounded-lg w-80 text-sm outline-none transition-all"
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 border-l pl-4 border-gray-200 relative">
          <button 
            onClick={() => navigate("/rate-calculator")} 
            className={`p-2 rounded-full transition-colors ${
                location.pathname === "/rate-calculator" ? "bg-teal-50 text-teal-600" : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <Calculator size={20} />
          </button>

          {/* Profile Container */}
          <div className="relative">
            <button 
              onClick={() => setShowLogout(!showLogout)}
              className={`flex items-center gap-2 ml-2 p-1 rounded-full transition-all ${showLogout ? "bg-gray-100 shadow-inner" : "hover:bg-gray-100"}`}
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
                  {/* User Info Header in Dropdown */}
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logged in as</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{user?.username || "User"}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
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