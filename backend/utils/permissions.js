const {
  ALL_SECTION_KEYS,
  DEFAULT_PERMISSIONS_BY_COMPANY_ROLE,
  PERMISSION_SECTIONS,
} = require("../constants/permissions");

const normalizePermissionEntry = (entry = {}) => ({
  read: Boolean(entry.read),
  write: Boolean(entry.write),
});

const resolvePermissions = (companyRole, storedPermissions = {}) => {
  const defaults =
    DEFAULT_PERMISSIONS_BY_COMPANY_ROLE[companyRole] ||
    DEFAULT_PERMISSIONS_BY_COMPANY_ROLE.viewer;

  const resolved = {};

  ALL_SECTION_KEYS.forEach((section) => {
    const override = storedPermissions?.[section];
    resolved[section] = override
      ? normalizePermissionEntry(override)
      : { ...defaults[section] };
  });

  return resolved;
};

const canAccess = (permissions, section, action = "read") => {
  if (!permissions?.[section]) return false;
  if (action === "write") return Boolean(permissions[section].write);
  return Boolean(permissions[section].read);
};

const canManageCompanyUsers = (user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.companyRole === "owner" || user.companyRole === "manager") {
    return canAccess(user.permissions, "team", "write");
  }
  return false;
};

const pathToSection = (pathname = "") => {
  const entries = Object.entries(PERMISSION_SECTIONS);
  for (const [section, meta] of entries) {
    if (meta.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return section;
    }
  }
  return null;
};

const sanitizePermissionsInput = (input = {}) => {
  const sanitized = {};
  ALL_SECTION_KEYS.forEach((section) => {
    if (input[section]) {
      sanitized[section] = normalizePermissionEntry(input[section]);
    }
  });
  return sanitized;
};

module.exports = {
  resolvePermissions,
  canAccess,
  canManageCompanyUsers,
  pathToSection,
  sanitizePermissionsInput,
  ALL_SECTION_KEYS,
};
