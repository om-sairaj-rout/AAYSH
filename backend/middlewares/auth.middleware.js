const jwt = require("jsonwebtoken");

const checkAuth = async (req, res, next) => {
    try {

        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access, please login first"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
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

module.exports = { checkAuth, authRoles };