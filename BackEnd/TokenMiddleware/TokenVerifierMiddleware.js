const jwt = require("jsonwebtoken");
const { userModel } = require("../models/userSchema");

// Verifies the access token AND that it is still current: the user must
// exist and its tokenVersion must match the token's `tv`. A password reset
// bumps tokenVersion, so access tokens issued before it stop working at once
// instead of staying valid for up to an hour.
const tokenVerificaionMiddleware = async (req, res, next) => {
    const accessToken = req.cookies?.['access_token'];

    if (!accessToken) {
        return res.status(401).json({ isSuccess: false, message: "Please login to continue" });
    }

    let decoded;
    try {
        decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ isSuccess: false, message: 'Invalid or expired access token' });
    }

    try {
        const user = await userModel.findById(decoded.id).select('tokenVersion role').lean();
        if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
            return res.status(401).json({ isSuccess: false, message: 'Session is no longer valid' });
        }

        // Role from the database, not the token, so a role change applies at once.
        req.user = { ...decoded, role: user.role };
        return next();
    } catch (err) {
        console.log("-----------Error in tokenVerificaionMiddleware------", err.message);
        return res.status(500).json({ isSuccess: false, message: "Internal Server error" });
    }
};

module.exports = { tokenVerificaionMiddleware };
