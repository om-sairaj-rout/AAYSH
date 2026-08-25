export const PERMISSION_SECTIONS = {
  dashboard: { label: "Dashboard" },
  upload: { label: "Upload Management" },
  orders: { label: "Orders & Reports" },
  shipments: { label: "Shipments" },
  pickup: { label: "Pickup Management" },
  reversePickup: { label: "Reverse Pickup" },
  team: { label: "Team Management" },
  update: { label: "Update Management" },
  settings: { label: "Settings Management" },
  tickets: { label: "Ticket Management" },
  companies: { label: "Company Management" },
  support: { label: "Support & Complaints" },
};

export const COMPANY_ROLES = [
  { id: "owner", label: "Owner" },
  { id: "manager", label: "Manager" },
  { id: "operator", label: "Operator" },
  { id: "viewer", label: "Viewer" },
];

const PATH_SECTION_MAP = {
  "/dashboard": "dashboard",
  "/upload/order-reports": "upload",
  "/upload/template": "upload",
  "/update/status": "upload",
  "/update/AWB": "update",
  "/update/serviceability": "update",
  "/update/courier-priority": "update",
  "/update/order-updates": "update",
  "/reports/orders": "orders",
  "/reports/all-orders": "orders",
  "/select-courier": "orders",
  "/catalog/products": "orders",
  "/rate-calculator": "orders",
  "/awb": "orders",
  "/reports/shipments": "shipments",
  "/pickup": "pickup",
  "/pickup/reverse": "reversePickup",
  "/company/team": "team",
  "/admin/tickets": "tickets",
  "/user/registrations": "companies",
  "/user/companies": "companies",
  "/user/create-account": "settings",
  "/user/edit-account": "settings",
  "/user/remove-account": "settings",
  "/contact": "support",
};

export const isUnrestrictedAdmin = (user) =>
  Boolean(user?.role === "admin" && !user?.permissionsManaged);

/** Platform-wide data access (all companies/orders) — role admin, including delegated admins. */
export const hasGlobalDataAccess = (user) => user?.role === "admin";

export const getSectionForPath = (pathname = "") => {
  if (PATH_SECTION_MAP[pathname]) return PATH_SECTION_MAP[pathname];
  const match = Object.entries(PATH_SECTION_MAP).find(([path]) =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
  return match ? match[1] : null;
};

export const canAccess = (user, section, action = "read") => {
  if (!user) return false;
  if (isUnrestrictedAdmin(user)) return true;
  const entry = user.permissions?.[section];
  if (!entry) return false;
  return action === "write" ? Boolean(entry.write) : Boolean(entry.read);
};

export const canManageTeam = (user) => {
  if (!user) return false;
  if (isUnrestrictedAdmin(user)) return true;
  if (user.role === "admin" && user.permissionsManaged) {
    return canAccess(user, "team", "write");
  }
  return (
    (user.companyRole === "owner" || user.companyRole === "manager") &&
    canAccess(user, "team", "write")
  );
};

export const canViewPath = (user, pathname) => {
  if (!user) return false;
  if (isUnrestrictedAdmin(user)) return true;
  const section = getSectionForPath(pathname);
  if (!section) return false;
  return canAccess(user, section, "read");
};

export const canWritePath = (user, pathname) => {
  if (!user) return false;
  if (isUnrestrictedAdmin(user)) return true;
  const section = getSectionForPath(pathname);
  if (!section) return false;
  return canAccess(user, section, "write");
};

export const buildDefaultPermissions = (companyRole) => {
  const allSections = Object.keys(PERMISSION_SECTIONS);
  const full = () =>
    allSections.reduce((acc, key) => {
      acc[key] = { read: true, write: true };
      return acc;
    }, {});
  const readOnly = () =>
    allSections.reduce((acc, key) => {
      acc[key] = { read: true, write: false };
      return acc;
    }, {});

  if (companyRole === "owner") return full();
  if (companyRole === "manager") return full();
  if (companyRole === "operator") {
    return {
      dashboard: { read: true, write: false },
      upload: { read: true, write: true },
      orders: { read: true, write: true },
      shipments: { read: true, write: true },
      pickup: { read: true, write: true },
      reversePickup: { read: true, write: true },
      team: { read: false, write: false },
      update: { read: false, write: false },
      settings: { read: false, write: false },
      tickets: { read: false, write: false },
      companies: { read: false, write: false },
      support: { read: true, write: false },
    };
  }
  return readOnly();
};

export const buildAdminDelegatedDefaultPermissions = () =>
  Object.keys(PERMISSION_SECTIONS).reduce((acc, key) => {
    acc[key] = { read: true, write: true };
    return acc;
  }, {});

export const getTeamPermissionSections = (manager) =>
  isUnrestrictedAdmin(manager)
    ? Object.entries(PERMISSION_SECTIONS)
    : Object.entries(PERMISSION_SECTIONS).filter(
        ([key]) =>
          !["update", "settings", "tickets", "companies"].includes(key)
      );
