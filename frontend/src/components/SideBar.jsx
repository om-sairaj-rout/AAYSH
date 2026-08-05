import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutDashboard, FileChartColumn, ChevronDown, X, PackageCheck, ShoppingBag, Truck, Barcode, Users } from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";

const SideBar = ({ isOpen, setIsOpen }) => {
  const [openMenus, setOpenMenus] = useState({});
  const { isAdmin } = useSelector((state) => state.auth);

  const toggleMenu = (name) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const menuItems = [
    {
      section: "MAIN",
      items: [
        {
          name: "Dashboard",
          icon: <LayoutDashboard size={20} />,
          path: "/dashboard",
        },
      ],
    },
    {
      section: "Upload Management",
      items: [
        {
          name: "Upload",
          icon: <FileChartColumn size={20} />,
          subItems: [
            { name: "Upload Report", path: "/upload/order-reports" },
            { name: "Excel Template", path: "/upload/template" },
            {
              adminOnly: true,
              name: "Excel Reports",
              path: "/upload/excel-reports",
            },
          ],
        },
      ],
    },
    {
      section: "Reports",
      items: [
        {
          name: "Orders",
          icon: <ShoppingBag size={20} />,
          subItems: [
            { name: "Order Report", path: "/reports/orders" },
            { name: "All Orders", path: "/reports/all-orders" },
          ],
        },
        {
          name: "Shipment",
          icon: <Truck size={20} />,
          subItems: [{ name: "Shipment Report", path: "/reports/shipments" }],
        },
      ],
    },
    {
      section: "Update Management",
      adminOnly: true,
      items: [
        {
          name: "Awb Management",
          icon: <Barcode size={20} />,
          path: "/update/AWB",
        },
        {
          name: "Serviceability Management",
          icon: <Barcode size={20} />,
          path: "/update/serviceability",
        },
        {
          name: "Courier Priority Management",
          icon: <Barcode size={20} />,
          path: "/update/courier-priority",
        },
      ],
    },
    {
      section: "Pickup details",
      items: [
        {
          name: "Pickup Management",
          icon: <PackageCheck size={20} />,
          path: "/pickup",
        },
      ],
    },
    {
      section: "Settings",
      adminOnly: true, 
      items: [
        {
          name: "Users",
          icon: <Users size={20} />,
          subItems: [
            { name: "Create User Account", path: "/user/create-account" },
            { name: "Edit User Profile", path: "/user/edit-account" },
            { name: "Remove User Account", path: "/user/remove-account" },
          ],
        },
      ],
    },
  ];

  const filteredMenu = menuItems.filter((group) => {
    if (group.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 lg:z-0 lg:sticky lg:top-0
      w-64 h-screen border-r border-gray-200 bg-white flex flex-col overflow-hidden
      transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}>
      {/* Sidebar Header Container */}
      <div className="z-10 p-2 border-b border-gray-100 bg-white flex items-center justify-between lg:justify-center shrink-0 px-4 lg:px-2">
        <img
          src={aayshlogo}
          alt="AayshExpress"
          className="h-16 object-contain mx-auto lg:mx-0"
        />
        {/* Sidebar dismissal button on responsive targets */}
        <button 
          onClick={() => setIsOpen(false)} 
          className="lg:hidden p-2 hover:bg-gray-100 rounded-md text-gray-500"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {filteredMenu.map((group, idx) => (
          <div key={idx} className="mb-6">
            <p className="text-xs font-bold text-gray-400 mb-4 tracking-wider uppercase">
              {group.section}
            </p>
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
                          isExpanded
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={isExpanded ? "text-gray-900" : "text-gray-500"}>
                            {item.icon}
                          </span>
                          <span className="text-[15px] font-medium">
                            {item.name}
                          </span>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                        />
                      </div>
                    ) : (
                      <NavLink
                        to={item.path}
                        onClick={() => setIsOpen(false)} // Closes mobile sidebar on view routing change actions
                        className={({ isActive }) =>
                          `flex items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200 ${
                            isActive
                              ? "bg-teal-50 text-teal-600 shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`
                        }
                      >
                        {item.icon}
                        <span className="text-[15px] font-medium">
                          {item.name}
                        </span>
                      </NavLink>
                    )}

                    {hasSubItems && isExpanded && (
                      <ul className="mt-2 ml-6 border-l-2 border-gray-100 relative">
                        {item.subItems
                          .filter((sub) => !(sub.adminOnly && !isAdmin))
                          .map((sub, subIdx) => (
                            <li key={subIdx}>
                              <NavLink
                                to={sub.path}
                                onClick={() => setIsOpen(false)} // Closes mobile drawer on subItem click
                                className={({ isActive }) =>
                                  `relative flex items-center py-2.5 pl-6 group transition-colors ${
                                    isActive
                                      ? "text-teal-600 font-semibold"
                                      : "text-gray-500 hover:text-teal-600"
                                  }`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    <div
                                      className={`absolute -left-1.25 w-2.5 h-2.5 rounded-full transition-colors ${
                                        isActive
                                          ? "bg-teal-600"
                                          : "bg-gray-300 group-hover:bg-teal-600"
                                      }`}
                                    />
                                    <span className="text-[14px]">
                                      {sub.name}
                                    </span>
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