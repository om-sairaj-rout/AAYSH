import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux"; // Added to access Redux state
import { 
  LayoutDashboard, 
  FileChartColumn, 
  ChevronDown, 
  UserPlus // Added a more relevant icon for user creation
} from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";

const SideBar = () => {
  const [openMenus, setOpenMenus] = useState({});
  // Get isAdmin from your checkAuth slice
  const { isAdmin } = useSelector((state) => state.auth);

  const toggleMenu = (name) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const menuItems = [
    { 
      section: "MAIN", 
      items: [{ name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" }] 
    },
    { 
      section: "REPORTS", 
      items: [
        { 
          name: "Analytics & Support", 
          icon: <FileChartColumn size={20} />,
          subItems: [{ name: "Order Report", path: "/reports/orders" }]
        },
        { name: "Upload Report", icon: <FileChartColumn size={20} />, path: "/reports/upload" },
      ] 
    },
    { 
      section: "Settings", 
      adminOnly: true, // Mark this section as restricted
      items: [{ name: "Create User Account", icon: <UserPlus size={20} />, path: "/settings/create-account" }] 
    },
  ];

  // Filter the menu based on the user's role
  const filteredMenu = menuItems.filter(group => {
    if (group.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside className="w-[20%] h-screen sticky top-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="z-10 p-2 border-b border-gray-100 bg-white flex justify-center shrink-0">
        <img src={aayshlogo} alt="AayshExpress" className="h-16 object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {filteredMenu.map((group, idx) => (
          <div key={idx} className="mb-6">
            <p className="text-xs font-bold text-gray-400 mb-4 tracking-wider uppercase">{group.section}</p>
            <ul>
              {group.items.map((item, i) => {
                const isExpanded = openMenus[item.name];
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <li key={i} className="mb-2">
                    {hasSubItems ? (
                      <div 
                        onClick={() => toggleMenu(item.name)}
                        className={`flex items-center justify-between py-3 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          isExpanded ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={isExpanded ? "text-gray-900" : "text-gray-500"}>{item.icon}</span>
                          <span className="text-[15px] font-medium">{item.name}</span>
                        </div>
                        <ChevronDown size={18} className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      </div>
                    ) : (
                      <NavLink 
                        to={item.path}
                        className={({ isActive }) => 
                          `flex items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200 ${
                            isActive ? "bg-teal-50 text-teal-600 shadow-sm" : "text-gray-600 hover:bg-gray-100"
                          }`
                        }
                      >
                        {item.icon}
                        <span className="text-[15px] font-medium">{item.name}</span>
                      </NavLink>
                    )}

                    {hasSubItems && isExpanded && (
                      <ul className="mt-2 ml-6 border-l-2 border-gray-100 relative">
                        {item.subItems.map((sub, subIdx) => (
                          <li key={subIdx}>
                            <NavLink 
                              to={sub.path}
                              className={({ isActive }) => 
                                `relative flex items-center py-2.5 pl-6 group transition-colors ${
                                  isActive ? "text-teal-600 font-semibold" : "text-gray-500 hover:text-teal-600"
                                }`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <div className={`absolute -left-1.25 w-2.5 h-2.5 rounded-full transition-colors ${
                                    isActive ? "bg-teal-600" : "bg-gray-300 group-hover:bg-teal-600"
                                  }`} />
                                  <span className="text-[14px]">{sub.name}</span>
                                </>
                              )}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default SideBar;