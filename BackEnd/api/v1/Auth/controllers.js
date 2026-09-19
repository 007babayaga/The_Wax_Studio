const { userModel } = require("../../../models/userSchema");
const { emailOtpModel } = require("../../../models/emailOtpSchema");
const { sendOtp } = require("../../../utils/emailHelper");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require('crypto');

//const ACCESS_COOKIE_NAME = 'access_token';
//const REFRESH_COOKIE_NAME = 'refresh_token';

const userSignUpController = async (req, res) => {
    try {
        console.log("--------------Inside userSignUpController----------------");
        const { name, dateOfBirth, email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({
                isSuccess: false,
                message: "Name, email and password are required"
            });
        }

        const existingUser = await userModel.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                isSuccess: false,
                message: "User already exists with this email"
            });
        }

        await userModel.create({
            name: String(name).trim(),
            dateOfBirth,
            email: normalizedEmail,
            password,
            isVerified: true
        });

        return res.status(200).json({
            isSuccess: true,
            message: "SignUp Success!"
        });
    }
    catch (err) {
        console.log("-----------Error in userSignUpController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const createAccessToken = (user) => jwt.sign(
    { id: user._id.toString(), role: user.role || 'user', tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

const createRefreshToken = (user, jti) => jwt.sign(
    { id: user._id.toString(), jti },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' }
);

const isProd = process.env.NODE_ENV === "production";

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        path: '/',
        maxAge: 1000 * 60 * 60 // 1 hour
    });
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });
};

const googleAuthController = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken || typeof idToken !== 'string') {
            res.status(400).json(
                {
                    isSuccess: false,
                    message: 'ID token is required'
                });
            return
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) return res.status(401).json({ isSuccess: false, message: 'Invalid Google token' });

        const { email, name, sub: googleId, picture, email_verified, iss, exp } = payload;

        if (!email || !email_verified) return res.status(401).json({ isSuccess: false, message: 'Google account not verified' });
        if (!['accounts.google.com', 'https://accounts.google.com'].includes(iss)) return res.status(401).json({ isSuccess: false, message: 'Invalid token issuer' });
        const now = Math.floor(Date.now() / 1000);
        if (typeof exp === 'number' && exp < now) return res.status(401).json({ isSuccess: false, message: 'Google token expired' });

        // Upsert user
        const user = await userModel.findOneAndUpdate(
            { email },
            {
                $setOnInsert: {
                    name,
                    email,
                    googleId,
                    profilePicture: picture || '',
                    authProvider: 'google',
                    isVerified: true,
                    role: 'user',
                    tokenVersion: 0,
                    sessions: []
                }
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        // Generate jti
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        const seed = `${user._id}|${Date.now()}|${Math.random()}`;
        const jti = await bcrypt.hash(seed, saltRounds);

        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user, jti);


        await userModel.updateOne(
            { _id: user._id },
            {
                $push: {
                    sessions: {
                        jti,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        userAgent: req.get('User-Agent') || '',
                        ip: req.ip || req.connection?.remoteAddress || ''
                    }
                }
            }
        );

        setAuthCookies(res, accessToken, refreshToken);

        return res.status(200).json({
            isSuccess: true,
            message: 'Signed in with Google successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('googleAuthController error:', err.message);
        return res.status(500).json({ isSuccess: false, message: 'Internal Server error' });
    }
};

const userLoginController = async (req, res) => {
    try {
        console.log("--------------Inside userLoginController----------------")
        const { email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                isSuccess: false,
                message: "Email and password are required"
            });
        }

        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({
                isSuccess: false,
                message: "Invalid email or password"
            });
        }

        if (user.authProvider !== "local") {
            return res.status(401).json({
                isSuccess: false,
                message: "Please sign in with Google"
            });
        }

        const isPasswordValid = await bcrypt.compare(String(password), user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                isSuccess: false,
                message: "Invalid email or password"
            });
        }

        // Generate jti for refresh token
        const jti = crypto.randomBytes(16).toString('hex');

        // Create tokens
        const accessToken = jwt.sign(
            { id: user._id, role: user.role, tv: user.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        const refreshToken = jwt.sign(
            { id: user._id, jti },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "30d" }
        );

        // Save session
        await userModel.updateOne(
            { _id: user._id },
            {
                $push: {
                    sessions: {
                        jti,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        userAgent: req.get('User-Agent') || '',
                        ip: req.ip || req.connection?.remoteAddress || ''
                    }
                }
            }
        );

        const isProd = process.env.NODE_ENV === "production"; 

        // Set cookies
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "None" : "Lax",
            path: "/",
            maxAge: 1000 * 60 * 60 // 1h
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "None" : "Lax",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 30 // 30d
        });

        return res.status(200).json({
            isSuccess: true,
            message: "Login Success!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (err) {
        console.log("-----------Error in userLoginController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};

const userLogoutController = async (req, res) => {
    try {
        console.log("--------------Inside userLogoutController----------------")
        const userId = req.user?.id || req.user?._id;
        const jti = req.tokenJti;

        if (!userId) {
            return res.status(401).json({
                isSuccess: false,
                message: "Authentication required"
            });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                isSuccess: false,
                message: "User not found"
            });
        }

        if (jti) {
            user.sessions = (user.sessions || []).filter(session => session.jti !== jti);
            await user.save();
        }

        res.clearCookie('access_token', { path: "/" });
        res.clearCookie('refresh_token', { path: "/" });

        return res.status(200).json({
            isSuccess: true,
            message: "Logged out successfully"
        });
    }
    catch (err) {
        console.log("-----------Error in userLogoutController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};

const authStatusController = async (req, res) => {
    try {
        console.log("--------------Inside authStatusController----------------");

        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                isSuccess: false,
                message: "Authentication required"
            });
        }

        const user = await userModel.findById(userId).select('name email role');
        if (!user) {
            return res.status(404).json({
                isSuccess: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            isSuccess: true,
            message: "User is logged in",
            user
        });
    } catch (err) {
        console.log("-----------Error in authStatusController------", err.message);
        res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
        return
    }
};

//when The user Logs In SuccessFully ,accesTokenGenerated,refreshTokenGenerated (expiration time 1 hour,30days)-> all the Api endpoints are now 
// with acessTokenMiddleware >> if AcessTokenisExpired then >> frontned silently calls Refresh Token api /api/v1/auth/refreshToken
const refreshTokenController = async (req, res) => {
    try {
        console.log("--------------Inside refreshTokenController----------------")

        const isProd = process.env.NODE_ENV === "production";

        const token = req.cookies['refresh_token'];
        if (!token) {
            return res.status(401).json({ isSuccess: false, message: 'No refresh token provided' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        } catch (err) {
            return res.status(401).json({ isSuccess: false, message: 'Invalid or expired refresh token' });
        }

        const { id, jti } = decoded;
        const user = await userModel.findById(id);
        if (!user) return res.status(404).json({ isSuccess: false, message: 'User not found' });

        const session = user.sessions.find(s => s.jti === jti);
        if (!session) return res.status(401).json({ isSuccess: false, message: 'Session not found' });
        if (session.expiresAt < new Date()) {
            return res.status(401).json({ isSuccess: false, message: 'Session expired' });
        }

        const accessToken = jwt.sign(
            { id: user._id, role: user.role, tv: user.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const newJti = require('crypto').randomBytes(16).toString('hex');
        const newRefreshToken = jwt.sign({ id: user._id, jti: newJti }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });

        await userModel.updateOne(
            { _id: user._id, 'sessions.jti': jti },
            {
                $set: {
                    'sessions.$.jti': newJti,
                    'sessions.$.createdAt': new Date(),
                    'sessions.$.expiresAt': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            }
        );

        res.cookie(ACCESS_COOKIE_NAME, accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            path: '/',
            maxAge: 1000 * 60 * 60
        });
        res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24 * 30
        });

        return res.status(200).json({ isSuccess: true, message: 'Token refreshed successfully' });

    }
    catch (err) {
        console.log("-----------Error in refreshTokenController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};





module.exports = { userSignUpController, googleAuthController, userLoginController, refreshTokenController,userLogoutController,authStatusController };