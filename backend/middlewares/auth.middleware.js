const jwt = require("jsonwebtoken");

const checkAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
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
            message: "Unauthorized access, please login first",
            error: error.message
        });
    }
};

const authRoles = (...roles) => {
    return (req,res,next) => {
        if(!req.user || !roles.includes(req.user.role)){
            return res.status(403).json({
                message: "Forbidden access, you do not have the required permissions"
            });
        }
        next();
    }
}

module.exports = {checkAuth,authRoles};