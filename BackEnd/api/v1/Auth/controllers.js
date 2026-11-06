const { userModel } = require("../../../models/userSchema");
const {
    OTP_PURPOSES,
    SIGNUP_COOKIE_NAME,
    issueOtp,
    verifyOtp,
    consumeOtp,
    consumeSignupVerification,
    deleteAllOtpsForEmail
} = require("../../../utils/otpService");
const { baseCookieOptions } = require("../../../utils/cookieOptions");
const { uploadImageBuffer, deleteImage } = require("../../../utils/cloudinaryHelper");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require('crypto');

const userSignUpController = async (req, res) => {
    try {
        console.log("--------------Inside userSignUpController----------------");
        const { name, dateOfBirth, email, password } = req.body || {};
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

        // The email must have been proven with an OTP (POST /otp/verifyEmailOtp)
        // shortly before, by THIS browser: the verify step set an httpOnly
        // cookie holding a one-time token. Without it, anyone could finish the
        // sign-up for an address someone else just verified.
        const verified = await consumeSignupVerification({
            email: normalizedEmail,
            token: req.cookies?.[SIGNUP_COOKIE_NAME]
        });
        if (!verified) {
            return res.status(403).json({
                isSuccess: false,
                message: "Please verify your email with the OTP before signing up"
            });
        }

        try {
            await userModel.create({
                name: String(name).trim(),
                dateOfBirth,
                email: normalizedEmail,
                password,
                isVerified: true
            });
        } catch (err) {
            // Lost a race with another sign-up for the same email.
            if (err?.code === 11000) {
                return res.status(409).json({
                    isSuccess: false,
                    message: "User already exists with this email"
                });
            }
            throw err;
        }
        res.clearCookie(SIGNUP_COOKIE_NAME, baseCookieOptions());
        await deleteAllOtpsForEmail(normalizedEmail);

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


// `tv` (tokenVersion) is checked on every request by the token middleware, so
// bumping it (password reset) kills access tokens that were already issued.
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

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Oldest sessions (devices) are dropped beyond this many.
const MAX_SESSIONS_PER_USER = 10;

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, {
        ...baseCookieOptions(),
        maxAge: 1000 * 60 * 60 // 1 hour
    });
    res.cookie('refresh_token', refreshToken, {
        ...baseCookieOptions(),
        maxAge: SESSION_TTL_MS
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie('access_token', baseCookieOptions());
    res.clearCookie('refresh_token', baseCookieOptions());
};

// Stores a new login session, dropping expired ones and keeping only the
// newest MAX_SESSIONS_PER_USER so the array can't grow forever.
const addSession = async (userId, jti, req) => {
    const now = new Date();
    await userModel.updateOne(
        { _id: userId },
        { $pull: { sessions: { expiresAt: { $lt: now } } } }
    );
    await userModel.updateOne(
        { _id: userId },
        {
            $push: {
                sessions: {
                    $each: [{
                        jti,
                        createdAt: now,
                        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
                        userAgent: req.get('User-Agent') || '',
                        ip: req.ip || req.socket?.remoteAddress || ''
                    }],
                    $slice: -MAX_SESSIONS_PER_USER
                }
            }
        }
    );
};

const googleAuthController = async (req, res) => {
    try {
        const { idToken } = req.body || {};
        if (!idToken || typeof idToken !== 'string') {
            res.status(400).json(
                {
                    isSuccess: false,
                    message: 'ID token is required'
                });
            return
        }

        // A forged, expired or wrong-audience token makes verifyIdToken throw;
        // that's the client's fault, so 401 rather than 500.
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.log("---Google token rejected---", verifyError.message);
            return res.status(401).json({ isSuccess: false, message: 'Invalid Google token' });
        }
        if (!payload) return res.status(401).json({ isSuccess: false, message: 'Invalid Google token' });

        const { name, sub: googleId, picture, email_verified, iss, exp } = payload;
        const email = String(payload.email || '').trim().toLowerCase();

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

        const jti = crypto.randomBytes(16).toString('hex');

        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user, jti);

        await addSession(user._id, jti, req);

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
        const { email, password } = req.body || {};
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

        const jti = crypto.randomBytes(16).toString('hex');

        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user, jti);

        await addSession(user._id, jti, req);

        setAuthCookies(res, accessToken, refreshToken);

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

// Works from the refresh token alone, so logging out still ends the session
// after the 1-hour access token has expired. Always clears the cookies.
const userLogoutController = async (req, res) => {
    try {
        console.log("--------------Inside userLogoutController----------------")
        const refreshToken = req.cookies?.['refresh_token'];

        if (refreshToken) {
            try {
                // Expired refresh tokens still identify the session to remove.
                const { id, jti } = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, { ignoreExpiration: true });
                if (id && jti) {
                    await userModel.updateOne({ _id: id }, { $pull: { sessions: { jti } } });
                }
            } catch (tokenError) {
                // A tampered token has no session to end; just clear cookies.
                console.log("---Logout with invalid refresh token---", tokenError.message);
            }
        }

        clearAuthCookies(res);

        return res.status(200).json({
            isSuccess: true,
            message: "Logged out successfully"
        });
    }
    catch (err) {
        console.log("-----------Error in userLogoutController------", err.message);
        clearAuthCookies(res);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};

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
        const canReset = Boolean(user && user.authProvider === "local");

        // Unknown emails go through the same cooldown and send limit (only the
        // email itself is skipped), so a 429 doesn't reveal that an account exists.
        const result = await issueOtp({
            email,
            purpose: OTP_PURPOSES.RESET,
            deliver: canReset
        });

        if (result.status === "cooldown" || result.status === "limit") {
            const seconds = result.retryAfterSeconds;
            const message = result.status === "cooldown"
                ? `Please wait ${seconds} seconds before requesting another OTP`
                : `Too many OTP requests for this email. Please try again in ${Math.ceil(seconds / 60)} minutes`;
            return res.status(429).json({
                isSuccess: false,
                message,
                retryAfterSeconds: seconds
            });
        }

        if (result.status === "send_failed") {
            // Logged for us; the client still gets the generic answer so a
            // failure doesn't confirm the account exists. The cooldown was
            // lifted, so the user can simply ask again.
            console.log("-----------Reset OTP email failed------", result.error?.message);
        }

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

        const result = await verifyOtp({ email, otp, purpose: OTP_PURPOSES.RESET });

        switch (result.status) {
            case "not_found":
                return res.status(400).json({
                    isSuccess: false,
                    message: "Invalid or expired OTP"
                });
            case "expired":
                return res.status(400).json({
                    isSuccess: false,
                    message: "OTP has expired"
                });
            case "locked":
                return res.status(429).json({
                    isSuccess: false,
                    message: "Too many invalid attempts. Please request a new OTP"
                });
            case "invalid":
                return res.status(400).json({
                    isSuccess: false,
                    message: "Invalid OTP",
                    attemptsLeft: result.attemptsLeft
                });
        }

        // Use the code up first: if two requests with the right code race,
        // only one gets to change the password.
        const consumed = await consumeOtp(result.record);
        const user = consumed ? await userModel.findOne({ email }) : null;
        if (!user || user.authProvider !== "local") {
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

        clearAuthCookies(res);

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
        await deleteAllOtpsForEmail(user.email);

        // Best effort: a failed cleanup shouldn't fail the deletion.
        if (profilePicturePublicId) {
            deleteImage(profilePicturePublicId).catch((err) =>
                console.log("---Could not delete profile picture---", err.message)
            );
        }

        clearAuthCookies(res);

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

        const token = req.cookies?.['refresh_token'];
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
        // 401 (not 404) so the frontend treats a deleted account as signed out.
        if (!user) return res.status(401).json({ isSuccess: false, message: 'User not found' });

        const session = user.sessions.find(s => s.jti === jti);
        if (!session) return res.status(401).json({ isSuccess: false, message: 'Session not found' });
        if (session.expiresAt < new Date()) {
            return res.status(401).json({ isSuccess: false, message: 'Session expired' });
        }

        const accessToken = createAccessToken(user);

        const newJti = crypto.randomBytes(16).toString('hex');
        const newRefreshToken = createRefreshToken(user, newJti);

        // Matching on the old jti makes rotation single-use: if two requests
        // race with the same refresh token, only one of them wins.
        const rotation = await userModel.updateOne(
            { _id: user._id, 'sessions.jti': jti },
            {
                $set: {
                    'sessions.$.jti': newJti,
                    'sessions.$.createdAt': new Date(),
                    'sessions.$.expiresAt': new Date(Date.now() + SESSION_TTL_MS)
                }
            }
        );
        if (rotation.modifiedCount === 0) {
            return res.status(401).json({ isSuccess: false, message: 'Session not found' });
        }

        setAuthCookies(res, accessToken, newRefreshToken);

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