const { userModel } = require("../../../models/userSchema");
const { emailOtpModel } = require("../../../models/emailOtpSchema");
const { sendOtp } = require("../../../utils/emailHelper");
const { uploadImageBuffer, deleteImage } = require("../../../utils/cloudinaryHelper");
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
                role: user.role,
                profilePicture: user.profilePicture,
                phone: user.phone,
                notificationPreferences: user.notificationPreferences,
                authProvider: user.authProvider
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
                role: user.role,
                profilePicture: user.profilePicture,
                phone: user.phone,
                notificationPreferences: user.notificationPreferences,
                authProvider: user.authProvider
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

const RESET_OTP_TTL_MS = 5 * 60 * 1000; // keep in sync with OTP_TTL_MINUTES in emailHelper
const RESET_OTP_COOLDOWN_MS = 2 * 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;

const forgotPasswordController = async (req, res) => {
    try {
        console.log("--------------Inside forgotPasswordController----------------");
        const { email } = req.body;

        // Same response whether or not the account exists, so emails can't be enumerated
        const genericResponse = {
            isSuccess: true,
            message: "If an account exists for this email, an OTP has been sent"
        };

        const user = await userModel.findOne({ email });
        if (!user || user.authProvider !== "local") {
            return res.status(200).json(genericResponse);
        }

        const existingOtp = await emailOtpModel.findOne({ email });
        if (existingOtp?.lastSentAt) {
            const timeSinceLastOtp = Date.now() - new Date(existingOtp.lastSentAt).getTime();
            if (timeSinceLastOtp < RESET_OTP_COOLDOWN_MS) {
                const remainingSeconds = Math.ceil((RESET_OTP_COOLDOWN_MS - timeSinceLastOtp) / 1000);
                return res.status(429).json({
                    isSuccess: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting another OTP`,
                    retryAfterSeconds: remainingSeconds
                });
            }
        }

        const otp = crypto.randomInt(10000, 100000).toString(); // 5-digit OTP

        await emailOtpModel.deleteMany({ email });
        await emailOtpModel.create({
            email,
            otp,
            otpExpiryTime: new Date(Date.now() + RESET_OTP_TTL_MS),
            lastSentAt: new Date()
        });

        await sendOtp(email, otp);

        return res.status(200).json(genericResponse);
    }
    catch (err) {
        console.log("-----------Error in forgotPasswordController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};

const resetPasswordController = async (req, res) => {
    try {
        console.log("--------------Inside resetPasswordController----------------");
        const { email, otp, newPassword } = req.body;

        const otpDoc = await emailOtpModel.findOne({ email });
        if (!otpDoc) {
            return res.status(400).json({
                isSuccess: false,
                message: "Invalid or expired OTP"
            });
        }

        if (new Date() > new Date(otpDoc.otpExpiryTime)) {
            await emailOtpModel.deleteOne({ _id: otpDoc._id });
            return res.status(400).json({
                isSuccess: false,
                message: "OTP has expired"
            });
        }

        const isOtpMatched = await otpDoc.compareOtp(otp);
        if (!isOtpMatched) {
            const attempts = (otpDoc.attempts || 0) + 1;
            if (attempts >= RESET_OTP_MAX_ATTEMPTS) {
                await emailOtpModel.deleteOne({ _id: otpDoc._id });
                return res.status(429).json({
                    isSuccess: false,
                    message: "Too many invalid attempts. Please request a new OTP"
                });
            }
            await emailOtpModel.updateOne({ _id: otpDoc._id }, { $set: { attempts } });
            return res.status(400).json({
                isSuccess: false,
                message: "Invalid OTP"
            });
        }

        const user = await userModel.findOne({ email });
        if (!user || user.authProvider !== "local") {
            await emailOtpModel.deleteOne({ _id: otpDoc._id });
            return res.status(400).json({
                isSuccess: false,
                message: "Invalid or expired OTP"
            });
        }

        // pre('save') hook hashes the password; bumping tokenVersion and clearing
        // sessions logs the user out of every device
        user.password = String(newPassword);
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.sessions = [];
        await user.save();

        await emailOtpModel.deleteOne({ _id: otpDoc._id });

        res.clearCookie('access_token', { path: "/" });
        res.clearCookie('refresh_token', { path: "/" });

        return res.status(200).json({
            isSuccess: true,
            message: "Password reset successfully. Please login with your new password"
        });
    }
    catch (err) {
        console.log("-----------Error in resetPasswordController------", err.message);
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

        const user = await userModel.findById(userId).select('name email role profilePicture phone notificationPreferences authProvider');
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

const uploadProfilePictureController = async (req, res) => {
    try {
        console.log("--------------Inside uploadProfilePictureController----------------");

        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({
                isSuccess: false,
                message: "Authentication required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                isSuccess: false,
                message: "Profile photo is required"
            });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                isSuccess: false,
                message: "User not found"
            });
        }

        // Cloudinary re-encodes the image, so whatever was uploaded is stored
        // as a clean 400x400 picture cropped around the face.
        const result = await uploadImageBuffer(req.file.buffer, {
            folder: "profile_pictures",
            transformation: [
                { width: 400, height: 400, crop: "fill", gravity: "face" },
                { quality: "auto", fetch_format: "auto" }
            ]
        });

        const previousPublicId = user.profilePicturePublicId;

        user.profilePicture = result.secure_url;
        user.profilePicturePublicId = result.public_id;
        await user.save();

        // Best effort: a failed cleanup shouldn't fail the upload.
        if (previousPublicId) {
            deleteImage(previousPublicId).catch((err) =>
                console.log("---Could not delete old profile picture---", err.message)
            );
        }

        return res.status(200).json({
            isSuccess: true,
            message: "Profile photo updated successfully",
            profilePicture: user.profilePicture
        });
    } catch (err) {
        console.log("-----------Error in uploadProfilePictureController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Could not upload profile photo"
        });
    }
};

const ALLOWED_COUNTRY_CODES = ["+91", "+1", "+44", "+971"];
const NOTIFICATION_KEYS = ["email", "push", "sms"];

// Partial update: only the fields that are sent get changed.
const updateProfileController = async (req, res) => {
    try {
        console.log("--------------Inside updateProfileController----------------");

        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({
                isSuccess: false,
                message: "Authentication required"
            });
        }

        const { name, phone, notificationPreferences } = req.body || {};
        const updates = {};

        if (name !== undefined) {
            const trimmedName = typeof name === "string" ? name.trim() : "";
            if (trimmedName.length < 3 || trimmedName.length > 80) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Name must be between 3 and 80 characters"
                });
            }
            updates.name = trimmedName;
        }

        if (phone !== undefined) {
            const countryCode = String(phone?.countryCode ?? "+91");
            const number = String(phone?.number ?? "").replace(/[\s-]/g, "");

            if (!ALLOWED_COUNTRY_CODES.includes(countryCode)) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Unsupported country code"
                });
            }
            // Empty clears the number; otherwise 6-15 digits.
            if (number && !/^\d{6,15}$/.test(number)) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Enter a valid phone number"
                });
            }
            updates["phone.countryCode"] = countryCode;
            updates["phone.number"] = number;
        }

        if (notificationPreferences !== undefined) {
            if (typeof notificationPreferences !== "object" || notificationPreferences === null) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Notification preferences are invalid"
                });
            }
            for (const key of NOTIFICATION_KEYS) {
                const value = notificationPreferences[key];
                if (value === undefined) continue;
                if (typeof value !== "boolean") {
                    return res.status(400).json({
                        isSuccess: false,
                        message: "Notification preferences must be true or false"
                    });
                }
                updates[`notificationPreferences.${key}`] = value;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                isSuccess: false,
                message: "Nothing to update"
            });
        }

        const user = await userModel
            .findByIdAndUpdate(userId, { $set: updates }, { returnDocument: "after", runValidators: true })
            .select("name email role profilePicture phone notificationPreferences authProvider");

        if (!user) {
            return res.status(404).json({
                isSuccess: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            isSuccess: true,
            message: "Profile updated successfully",
            user
        });
    } catch (err) {
        console.log("-----------Error in updateProfileController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Could not update profile"
        });
    }
};

// Google accounts have no password, so they confirm by typing this instead.
const DELETE_CONFIRMATION_TEXT = "DELETE";

// Permanently deletes the signed-in account. Products the user created stay
// in the catalog; only the account itself is removed.
const deleteAccountController = async (req, res) => {
    try {
        console.log("--------------Inside deleteAccountController----------------");

        const userId = req.user?.id || req.user?._id;
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

        // Wrong confirmation is 403, not 401, so the frontend doesn't treat it
        // as an expired session and try to refresh.
        const { password, confirmation } = req.body || {};
        if (user.authProvider === "local") {
            if (!password) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Password is required"
                });
            }
            const isPasswordValid = await bcrypt.compare(String(password), user.password);
            if (!isPasswordValid) {
                return res.status(403).json({
                    isSuccess: false,
                    message: "Incorrect password"
                });
            }
        } else if (String(confirmation || "").trim() !== DELETE_CONFIRMATION_TEXT) {
            return res.status(400).json({
                isSuccess: false,
                message: `Type ${DELETE_CONFIRMATION_TEXT} to confirm`
            });
        }

        // Never leave the store without an admin who can sign in.
        if (user.role === "admin") {
            const adminCount = await userModel.countDocuments({ role: "admin" });
            if (adminCount <= 1) {
                return res.status(409).json({
                    isSuccess: false,
                    message: "You are the only admin. Make another account an admin before deleting this one"
                });
            }
        }

        const profilePicturePublicId = user.profilePicturePublicId;

        await userModel.deleteOne({ _id: user._id });
        await emailOtpModel.deleteMany({ email: user.email });

        // Best effort: a failed cleanup shouldn't fail the deletion.
        if (profilePicturePublicId) {
            deleteImage(profilePicturePublicId).catch((err) =>
                console.log("---Could not delete profile picture---", err.message)
            );
        }

        res.clearCookie('access_token', { path: "/" });
        res.clearCookie('refresh_token', { path: "/" });

        return res.status(200).json({
            isSuccess: true,
            message: "Account deleted successfully"
        });
    } catch (err) {
        console.log("-----------Error in deleteAccountController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Could not delete account"
        });
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

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            path: '/',
            maxAge: 1000 * 60 * 60
        });
        res.cookie('refresh_token', newRefreshToken, {
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





module.exports = { userSignUpController, googleAuthController, userLoginController, refreshTokenController,userLogoutController,forgotPasswordController,resetPasswordController,authStatusController,uploadProfilePictureController,updateProfileController,deleteAccountController };