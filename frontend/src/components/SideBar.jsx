import { useState } from "react";
import { 
  LayoutDashboard, 
  FileChartColumn, 
  ChevronDown, 
  ChevronRight 
} from "lucide-react";
import aayshlogo2 from "../assets/aaysh_logo_2.png";

const SideBar = () => {
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (name) => {
    setOpenMenus((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const menuItems = [
    { 
      section: "MAIN", 
      items: [{ name: "Dashboard", icon: <LayoutDashboard size={20} /> }] 
    },
    { 
      section: "REPORTS", 
      items: [
        { 
          name: "Analytics & Support", 
          icon: <FileChartColumn size={20} />,
          subItems: [
            "Order Report",
          ]
        },
      ] 
    },
  ];

  return (
    // Fixed height of screen and overflow-hidden ensures the sidebar itself doesn't scroll
    <aside className="w-[20%] h-screen sticky top-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      
      {/* Logo Area */}
      <div className="z-10 p-4 border-b border-gray-100 bg-white flex justify-center shrink-0">
        <img src={aayshlogo2} alt="AayshExpress" className="h-12 object-contain" />
      </div>

      {/* Navigation: Added 'no-scrollbar' class here */}
      <nav className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {menuItems.map((group, idx) => (
          <div key={idx} className="mb-6">
            <p className="text-xs font-bold text-gray-400 mb-4 tracking-wider">{group.section}</p>
            <ul>
              {group.items.map((item, i) => {
                const isExpanded = openMenus[item.name];
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <li key={i} className="mb-2">
                    <div 
                      onClick={() => hasSubItems && toggleMenu(item.name)}
                      className={`flex items-center justify-between py-3 px-3 rounded-lg cursor-pointer transition-all duration-200 group ${
                        isExpanded ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isExpanded ? "text-gray-900" : "text-gray-500"}>
                          {item.icon}
                        </span>
                        <span className="text-[15px] font-medium">{item.name}</span>
                      </div>
                      
                      {hasSubItems && (
                        <span className="text-gray-400">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>
                      )}
                    </div>

                    {hasSubItems && isExpanded && (
                      <ul className="mt-2 ml-6 border-l-2 border-gray-100 relative">
                        {item.subItems.map((sub, subIdx) => (
                          <li key={subIdx} className="relative flex items-center py-2.5 pl-6 group cursor-pointer">
                            <div className="absolute -left-1.25 w-2 h-2 rounded-full bg-gray-300 group-hover:bg-teal-600 transition-colors" />
                            <span className="text-[14px] text-gray-500 group-hover:text-teal-600 transition-colors">
                              {sub}
                            </span>
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