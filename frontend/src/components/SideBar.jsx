import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { canViewPath } from "../utils/permissions";
import {
  LayoutDashboard,
  FileChartColumn,
  MapPinCheck,
  SlidersHorizontal,
  ChevronDown,
  X,
  PackageCheck,
  ShoppingBag,
  Truck,
  Barcode,
  Users,
  ArrowLeftRight,
  Headphones,
  RefreshCw,
} from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";

const NAVY = "#1B2B4B";
const NAVY_DARK = "#152238";

const SideBar = ({ isOpen, setIsOpen }) => {
  const [openMenus, setOpenMenus] = useState({});
  const { isAdmin, canManageTeam, user } = useSelector((state) => state.auth);
  const location = useLocation();

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
      section: "Reports",
      items: [
        {
          name: "Orders",
          icon: <ShoppingBag size={20} />,
          subItems: [
            { name: "All Orders", path: "/reports/all-orders" },
            { name: "Order Report", path: "/reports/orders" },
            { name: "Product Catalog", path: "/catalog/products" },
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
      section: "Upload Management",
      items: [
        {
          name: "Upload",
          icon: <FileChartColumn size={20} />,
          subItems: [
            { name: "Upload Report", path: "/upload/order-reports" },
            { name: "Excel Template", path: "/upload/template" },
          ],
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
          icon: <MapPinCheck size={20} />,
          path: "/update/serviceability",
        },
        {
          name: "Courier Priority Management",
          icon: <SlidersHorizontal size={20} />,
          path: "/update/courier-priority",
        },
        {
          name: "Order Update Management",
          icon: <RefreshCw size={20} />,
          path: "/update/order-updates",
        },
        {
          name: "Update Status",
          icon: <FileChartColumn size={20} />,
          path: "/update/status",
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
        {
          name: "Reverse Pickup",
          icon: <ArrowLeftRight size={20} />,
          path: "/pickup/reverse",
        },
      ],
    },
    {
      section: "Support",
      items: [
        {
          name: "Support & Complaints",
          icon: <Headphones size={20} />,
          path: "/contact",
        },
      ],
    },
    {
      section: "Settings",
      adminOnly: true,
      items: [
        {
          name: "Ticket Management",
          icon: <Headphones size={20} />,
          path: "/admin/tickets",
        },
        {
          name: "Users",
          icon: <Users size={20} />,
          subItems: [
            { name: "Registration Overview", path: "/user/registrations" },
            { name: "Create User Account", path: "/user/create-account" },
            { name: "Edit User Profile", path: "/user/edit-account" },
            { name: "Remove User Account", path: "/user/remove-account" },
          ],
        },
      ],
    },
    ...(canManageTeam
      ? [
          {
            section: "Company",
            items: [
              {
                name: "Team Management",
                icon: <Users size={20} />,
                path: "/company/team",
              },
            ],
          },
        ]
      : []),
  ];

  const canShowPath = (path) => {
    if (isAdmin) return true;
    return canViewPath(user, path);
  };

  const filteredMenu = menuItems
    .filter((group) => {
      if (group.adminOnly && !isAdmin) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (item.subItems) {
            const subItems = item.subItems.filter(
              (sub) => !(sub.adminOnly && !isAdmin) && canShowPath(sub.path)
            );
            return subItems.length ? { ...item, subItems } : null;
          }
          if (item.path && !canShowPath(item.path)) return null;
          return item;
        })
        .filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);

  const isSubItemActive = (subItems = []) =>
    subItems.some((sub) => location.pathname === sub.path);

  const parentLinkClass = (isActive, hasActiveChild) => {
    const active = isActive || hasActiveChild;
    return `relative flex items-center gap-3 py-3 pl-4 pr-3 rounded-l-2xl transition-all duration-200 ${
      active
        ? "bg-white text-[#1B2B4B] font-semibold shadow-[4px_0_20px_rgba(0,0,0,0.08)] mr-0"
        : "text-white/65 hover:text-white hover:bg-white/10"
    }`;
  };

  const parentToggleClass = (isExpanded, hasActiveChild) => {
    const active = isExpanded || hasActiveChild;
    return `relative flex items-center justify-between py-3 pl-4 pr-3 rounded-l-2xl cursor-pointer transition-all duration-200 ${
      active
        ? "bg-white/12 text-white"
        : "text-white/65 hover:text-white hover:bg-white/10"
    }`;
  };

  return (
    <aside
      className={`
      fixed inset-y-0 left-0 z-50 lg:z-0 lg:sticky lg:top-0
      w-64 h-screen flex flex-col overflow-hidden
      transition-transform duration-300 ease-in-out
      shadow-[4px_0_24px_rgba(27,43,75,0.18)]
      ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}
      style={{ backgroundColor: NAVY, borderRight: `1px solid ${NAVY_DARK}` }}
    >
      {/* Logo */}
      <div className="shrink-0 px-4 pt-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img src={aayshlogo} alt="AayshExpress" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Aaysh</p>
            <p className="text-white/45 text-[10px] font-semibold uppercase tracking-wider">
              Express
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-6 no-scrollbar">
        {filteredMenu.map((group, idx) => (
          <div key={idx} className="mb-5">
            <p className="text-[10px] font-bold text-white/35 mb-3 tracking-[0.14em] uppercase px-4">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item, i) => {
                const isExpanded = openMenus[item.name];
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const hasActiveChild = hasSubItems && isSubItemActive(item.subItems);

                return (
                  <li key={i}>
                    {hasSubItems ? (
                      <>
                        <div
                          onClick={() => toggleMenu(item.name)}
                          className={parentToggleClass(isExpanded, hasActiveChild)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={hasActiveChild ? "text-white" : "text-white/70"}>
                              {item.icon}
                            </span>
                            <span className="text-[14px] font-medium truncate">{item.name}</span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-white/50 transition-transform ${
                              isExpanded ? "" : "-rotate-90"
                            }`}
                          />
                        </div>

                        {isExpanded && (
                          <ul className="mt-1 ml-5 pl-4 border-l border-white/15 space-y-0.5">
                            {item.subItems.map((sub, subIdx) => (
                                <li key={subIdx}>
                                  <NavLink
                                    to={sub.path}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                      `block py-2.5 pr-3 text-[13px] rounded-lg transition-colors ${
                                        isActive
                                          ? "text-white font-semibold bg-white/10"
                                          : "text-white/50 hover:text-white hover:bg-white/5"
                                      }`
                                    }
                                  >
                                    {sub.name}
                                  </NavLink>
                                </li>
                              ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <NavLink
                        to={item.path}
                        end={item.path === "/pickup"}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) => parentLinkClass(isActive, false)}
                      >
                        {({ isActive }) => (
                          <>
                            <span className={isActive ? "text-[#1B2B4B]" : "text-white/70"}>
                              {item.icon}
                            </span>
                            <span className="text-[14px] font-medium truncate">{item.name}</span>
                          </>
                        )}
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 p-4 border-t border-white/10">
        <div className="rounded-2xl bg-white/8 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Logistics Portal
          </p>
        </div>
      </div>
    </aside>
  );
};

export default SideBar;
