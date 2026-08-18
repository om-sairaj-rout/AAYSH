export const PERMISSION_SECTIONS = {
  dashboard: { label: "Dashboard" },
  upload: { label: "Upload Management" },
  orders: { label: "Orders & Reports" },
  shipments: { label: "Shipments" },
  pickup: { label: "Pickup Management" },
  team: { label: "Team Management" },
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
  "/reports/orders": "orders",
  "/reports/all-orders": "orders",
  "/select-courier": "orders",
  "/catalog/products": "orders",
  "/rate-calculator": "orders",
  "/reports/shipments": "shipments",
  "/pickup": "pickup",
  "/pickup/reverse": "pickup",
  "/company/team": "team",
};

export const getSectionForPath = (pathname = "") => {
  if (PATH_SECTION_MAP[pathname]) return PATH_SECTION_MAP[pathname];
  const match = Object.entries(PATH_SECTION_MAP).find(([path]) =>
    pathname.startsWith(`${path}/`)
  );
  return match ? match[1] : null;
};

export const canAccess = (user, section, action = "read") => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const entry = user.permissions?.[section];
  if (!entry) return false;
  return action === "write" ? Boolean(entry.write) : Boolean(entry.read);
};

export const canManageTeam = (user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (
    (user.companyRole === "owner" || user.companyRole === "manager") &&
    canAccess(user, "team", "write")
  );
};

export const canViewPath = (user, pathname) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const section = getSectionForPath(pathname);
  if (!section) return true;
  return canAccess(user, section, "read");
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
      team: { read: false, write: false },
    };
  }
  return readOnly();
};
