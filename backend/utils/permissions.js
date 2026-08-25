const {
  ALL_SECTION_KEYS,
  DEFAULT_PERMISSIONS_BY_COMPANY_ROLE,
  PERMISSION_SECTIONS,
} = require("../constants/permissions");

const normalizePermissionEntry = (entry = {}) => ({
  read: Boolean(entry.read),
  write: Boolean(entry.write),
});

const isUnrestrictedAdmin = (user) =>
  Boolean(user?.role === "admin" && !user?.permissionsManaged);

const resolveSectionPermission = (section, storedPermissions, defaults) => {
  const override = storedPermissions?.[section];
  if (override) {
    return normalizePermissionEntry(override);
  }
  if (section === "reversePickup" && storedPermissions?.pickup) {
    return normalizePermissionEntry(storedPermissions.pickup);
  }
  return { ...(defaults[section] || { read: false, write: false }) };
};

const resolvePermissions = (
  companyRole,
  storedPermissions = {},
  options = {}
) => {
  if (options.permissionsManaged) {
    const resolved = {};
    ALL_SECTION_KEYS.forEach((section) => {
      const override = storedPermissions?.[section];
      if (override) {
        resolved[section] = normalizePermissionEntry(override);
      } else if (section === "reversePickup" && storedPermissions?.pickup) {
        resolved[section] = normalizePermissionEntry(storedPermissions.pickup);
      } else {
        resolved[section] = { read: false, write: false };
      }
    });
    return resolved;
  }

  const defaults =
    DEFAULT_PERMISSIONS_BY_COMPANY_ROLE[companyRole] ||
    DEFAULT_PERMISSIONS_BY_COMPANY_ROLE.viewer;

  const resolved = {};

  ALL_SECTION_KEYS.forEach((section) => {
    resolved[section] = resolveSectionPermission(
      section,
      storedPermissions,
      defaults
    );
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
  if (isUnrestrictedAdmin(user)) return true;
  if (user.role === "admin" && user.permissionsManaged) {
    return canAccess(user.permissions, "team", "write");
  }
  if (user.companyRole === "owner" || user.companyRole === "manager") {
    return canAccess(user.permissions, "team", "write");
  }
  return false;
};

const pathToSection = (pathname = "") => {
  const entries = Object.entries(PERMISSION_SECTIONS);
  for (const [section, meta] of entries) {
    if (
      meta.paths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
      )
    ) {
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

const getFullManagedAdminPermissions = () =>
  ALL_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = { read: true, write: true };
    return acc;
  }, {});

const isAdminCreatingOwnCompanyUser = (actor, companyID) =>
  Boolean(
    isUnrestrictedAdmin(actor) &&
      actor?.companyID &&
      String(actor.companyID).toUpperCase() ===
        String(companyID || "").toUpperCase()
  );

const userCanAccess = (user, section, action = "read") => {
  if (!user) return false;
  if (isUnrestrictedAdmin(user)) return true;
  const entry = user.permissions?.[section];
  if (!entry) return false;
  return action === "write" ? Boolean(entry.write) : Boolean(entry.read);
};

module.exports = {
  resolvePermissions,
  canAccess,
  canManageCompanyUsers,
  pathToSection,
  sanitizePermissionsInput,
  getFullManagedAdminPermissions,
  isAdminCreatingOwnCompanyUser,
  isUnrestrictedAdmin,
  userCanAccess,
  ALL_SECTION_KEYS,
};
