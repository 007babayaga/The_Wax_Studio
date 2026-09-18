const jwt = require("jsonwebtoken");
const { userModel } = require("../../../models/userSchema");

const isAuthenticated = async (req, res, next) => {
    try {
        console.log("------------Inside is isAuthenticated----------------");

        const token = req.cookies?.access_token;
        if (!token) {
            return res.status(401).json({
                isSuccess: false,
                message: "Not authenticated",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id || decoded._id);

        if (!user) {
            return res.status(401).json({
                isSuccess: false,
                message: "User not found",
            });
        }

        req.user = user;
        return next();
    } catch (err) {
        console.log("Error in isAuthenticated-", err.message);

        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            return res.status(401).json({
                isSuccess: false,
                message: "Invalid or expired token",
            });
        }

        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error",
        });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        console.log("------------Inside is isAdmin----------------");

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                isSuccess: false,
                message: "Admin access only",
            });
        }

        return next();
    } catch (err) {
        console.log("Error in isAdmin-", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = { isAuthenticated, isAdmin };