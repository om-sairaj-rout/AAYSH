const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {
  resolvePermissions,
  isUnrestrictedAdmin,
  userCanAccess,
} = require("../utils/permissions");

const checkAuth = async (req, res, next) => {
    try {

        let token = req.cookies.token;
        
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access, please login first"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userRecord = await User.findById(decoded.id)
            .select("companyID companyRole showWeight permissions role companyName permissionsManaged")
            .lean();

        if (!userRecord) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access, please login first"
            });
        }

        const storedPermissions = userRecord.permissions
                ? Object.fromEntries(
                    Object.entries(userRecord.permissions).map(([key, value]) => [
                      key,
                      value,
                    ])
                  )
                : userRecord.permissions;

        const permissions = resolvePermissions(
            userRecord.companyRole,
            storedPermissions,
            { permissionsManaged: userRecord.permissionsManaged }
        );

        req.user = {
            id: decoded.id,
            companyName: decoded.companyName || decoded.username || userRecord.companyName,
            companyID: userRecord.companyID || decoded.companyID || "",
            role: decoded.role || userRecord.role,
            companyRole: userRecord.companyRole || decoded.companyRole || "viewer",
            showWeight: userRecord.showWeight ?? decoded.showWeight,
            permissions,
            permissionsManaged: Boolean(userRecord.permissionsManaged),
        };

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized access",
            error: error.message
        });

    }
};

const authRoles = (...roles) => {
    return (req, res, next) => {

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden access"
            });
        }

        next();
    };
};

const requireUnrestrictedAdmin = (req, res, next) => {
    if (!isUnrestrictedAdmin(req.user)) {
        return res.status(403).json({
            success: false,
            message: "Forbidden access",
        });
    }
    return next();
};

const checkPermission = (section, action = "read") => {
    return (req, res, next) => {
        if (userCanAccess(req.user, section, action)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `You do not have ${action} access to ${section}`,
        });
    };
};

const checkAnyPermission = (sections, action = "read") => {
    return (req, res, next) => {
        if (isUnrestrictedAdmin(req.user)) {
            return next();
        }

        const allowed = sections.some((section) =>
            userCanAccess(req.user, section, action)
        );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: `You do not have ${action} access to this resource`,
            });
        }

        return next();
    };
};

module.exports = {
    checkAuth,
    authRoles,
    checkPermission,
    checkAnyPermission,
    requireUnrestrictedAdmin,
};
