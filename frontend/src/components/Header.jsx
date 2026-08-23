import { Search, UserCircle, LogOut, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../api/authAPI";
import { logout } from "../store/slice/checkAuth";
import { getOrderByAwb } from "../api/ordersAPI";
import { toast } from '../utils/toast';

const TIMEZONE = "Asia/Kolkata";

const getGreeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const useLiveISTClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const dayName = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(now);

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);

  return { time, dayName, dateLabel };
};

const Header = ({ setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);

  const [showLogout, setShowLogout] = useState(false);
  const [search, setSearch] = useState("");
  const { time, dayName, dateLabel } = useLiveISTClock();

  const isDashboard = location.pathname === "/dashboard";
  const displayName = user?.companyName || user?.email?.split("@")[0] || "User";

  const titles = {
    "/dashboard": "Dashboard",
    "/reports/orders": "Order Report",
    "/upload/order-reports": "Upload Report",
    "/upload/template": "Excel Template",
    "/reports/all-orders": "Orders",
    "/catalog/products": "Product Catalog",
    "/user/create-account": "Create User Account",
    "/user/registrations": "Registration Overview",
    "/company/team": "Team Management",
    "/rate-calculator": "Rate Calculator",
    "/user/edit-account": "Edit User Profile",
    "/user/remove-account": "Remove User Account",
    "/update/AWB": "AWB Management",
    "/update/status": "Update Status",
    "/pickup": "Pickup Management",
    "/pickup/reverse": "Reverse Pickup",
    "/contact": "Support & Complaints",
    "/admin/tickets": "Ticket Management",
    "/awb/:awbNumber": "AWB Information",
  };

  const currentTitle =
    titles[location.pathname] ||
    (location.pathname.startsWith("/user/companies/")
      ? "Company Details"
      : "Aaysh Express");

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
    <header className="sticky top-0 w-full min-h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 py-3 z-30 relative">
      <div className="flex items-center gap-3 min-w-0 z-10 flex-1">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors shrink-0"
        >
          <Menu size={24} />
        </button>
        {isDashboard ? (
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-[#1B2B4B] truncate">
              {getGreeting()}, {displayName}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium md:hidden mt-0.5">
              {dayName} · {dateLabel}
            </p>
          </div>
        ) : (
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800 truncate max-w-[180px] sm:max-w-none">
            {currentTitle}
          </h1>
        )}
      </div>

      {isDashboard && (
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center pointer-events-none">
          <p className="text-2xl font-black text-[#1B2B4B] tracking-[0.12em] tabular-nums font-mono">
            {time}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {dayName}, {dateLabel}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-4 justify-end z-10 flex-1">
        {isDashboard && (
          <div className="md:hidden flex flex-col items-end text-right mr-1">
            <p className="text-sm font-black text-[#1B2B4B] tabular-nums font-mono leading-none">
              {time}
            </p>
          </div>
        )}
        {/* Responsive Search Bar container */}
        {/* <div className="relative w-full max-w-[160px] sm:max-w-[240px] md:max-w-xs">
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
        </div> */}

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