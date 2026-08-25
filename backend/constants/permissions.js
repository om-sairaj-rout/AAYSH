const PERMISSION_SECTIONS = {
  dashboard: { label: "Dashboard", paths: ["/dashboard"] },
  upload: {
    label: "Upload Management",
    paths: ["/upload/order-reports", "/upload/template"],
  },
  orders: {
    label: "Orders & Reports",
    paths: [
      "/reports/orders",
      "/reports/all-orders",
      "/rate-calculator",
      "/catalog/products",
      "/select-courier",
      "/awb",
    ],
  },
  shipments: { label: "Shipments", paths: ["/reports/shipments"] },
  pickup: { label: "Pickup Management", paths: ["/pickup"] },
  reversePickup: {
    label: "Reverse Pickup",
    paths: ["/pickup/reverse"],
  },
  team: { label: "Team Management", paths: ["/company/team"] },
  update: {
    label: "Update Management",
    paths: [
      "/update/AWB",
      "/update/serviceability",
      "/update/courier-priority",
      "/update/order-updates",
      "/update/status",
    ],
  },
  settings: {
    label: "Settings Management",
    paths: [
      "/user/create-account",
      "/user/edit-account",
      "/user/remove-account",
    ],
  },
  tickets: { label: "Ticket Management", paths: ["/admin/tickets"] },
  companies: {
    label: "Company Management",
    paths: ["/user/registrations", "/user/companies"],
  },
  support: { label: "Support & Complaints", paths: ["/contact"] },
};

const ALL_SECTION_KEYS = Object.keys(PERMISSION_SECTIONS);

const fullAccess = () =>
  ALL_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = { read: true, write: true };
    return acc;
  }, {});

const readOnlyAccess = () =>
  ALL_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = { read: true, write: false };
    return acc;
  }, {});

const DEFAULT_PERMISSIONS_BY_COMPANY_ROLE = {
  owner: fullAccess(),
  manager: {
    ...readOnlyAccess(),
    dashboard: { read: true, write: true },
    upload: { read: true, write: true },
    orders: { read: true, write: true },
    shipments: { read: true, write: true },
    pickup: { read: true, write: true },
    reversePickup: { read: true, write: true },
    team: { read: true, write: true },
  },
  operator: {
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
  },
  viewer: readOnlyAccess(),
};

const COMPANY_ROLES = ["owner", "manager", "operator", "viewer"];

module.exports = {
  PERMISSION_SECTIONS,
  ALL_SECTION_KEYS,
  DEFAULT_PERMISSIONS_BY_COMPANY_ROLE,
  COMPANY_ROLES,
};
