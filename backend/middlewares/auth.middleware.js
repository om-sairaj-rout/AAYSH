const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { resolvePermissions } = require("../utils/permissions");

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
            .select("companyID companyRole showWeight permissions role companyName")
            .lean();

        if (!userRecord) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access, please login first"
            });
        }

        const permissions = resolvePermissions(
            userRecord.companyRole,
            userRecord.permissions
                ? Object.fromEntries(
                    Object.entries(userRecord.permissions).map(([key, value]) => [
                      key,
                      value,
                    ])
                  )
                : userRecord.permissions
        );

        req.user = {
            id: decoded.id,
            companyName: decoded.companyName || decoded.username || userRecord.companyName,
            companyID: userRecord.companyID || decoded.companyID || "",
            role: decoded.role || userRecord.role,
            companyRole: userRecord.companyRole || decoded.companyRole || "viewer",
            showWeight: userRecord.showWeight ?? decoded.showWeight,
            permissions,
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

const checkPermission = (section, action = "read") => {
    return (req, res, next) => {
        if (req.user?.role === "admin") {
            return next();
        }

        const entry = req.user?.permissions?.[section];
        const allowed =
            action === "write" ? entry?.write : entry?.read;

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: `You do not have ${action} access to ${section}`,
            });
        }

        return next();
    };
};

module.exports = { checkAuth, authRoles, checkPermission };
