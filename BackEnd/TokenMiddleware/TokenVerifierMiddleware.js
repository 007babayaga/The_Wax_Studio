const jwt = require("jsonwebtoken");

const tokenVerificaionMiddleware = (req, res, next) => {
    const accessToken = req.cookies['access_token'];   
    const refreshToken = req.cookies['refresh_token'];  
    
    if (!accessToken) {
        return res.status(401).json({ message: "Please login to continue" });
    }

    try {
        // Verify access token
        const decodedAccess = jwt.verify(accessToken, process.env.JWT_SECRET);
        req.user = decodedAccess; // { id, role, tv }

        // Decode refresh token (not mandatory for every request, but needed for logout)
        if (refreshToken) {
            try {
                const decodedRefresh = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                req.tokenJti = decodedRefresh.jti; // attach jti to request
            } catch (err) {
                // If refresh token is invalid, we can still proceed with access token
                console.warn("Invalid refresh token during middleware:", err.message);
            }
        }

        next();
    } catch (err) {
        res.status(401).json({
            message: 'Invalid or expired access token'
        })
        return 
    }
};

module.exports = { tokenVerificaionMiddleware };
