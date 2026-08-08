const { userModel } = require("../../../models/userSchema");
const { emailOtpModel } = require("../../../models/emailOtpSchema");
const { sendOtp } = require("../../../utils/emailHelper");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSignUpController = async (req, res) => {
    try {
        console.log("--------------Inside userSignUpController----------------")
        const { name, dateOfBirth, email, password } = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            res.status(409).json({
                isSuccess: false,
                message: "User already exists with this email"
            });
            return
        }
        await userModel.create({
            name,
            dateOfBirth,
            email,
            password,
            isVerified: true
        })
        res.status(200).json({
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

const googleAuthController = async (req, res) => {
    try {
        console.log("--------------Inside googleAuthController----------------")
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                isSuccess: false,
                message: "ID token is required"
            });
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId, picture } = payload;

        let user = await userModel.findOne({ email });

        if (!user) {
            user = await userModel.create({
                name,
                email,
                googleId,
                profilePicture: picture || "",
                authProvider: "google",
                isVerified: true
            });
            console.log("New user created via Google:", email);
        } else {
            console.log("Existing user logged in via Google:", email);
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            isSuccess: true,
            message: "Signed in with Google successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (err) {
        console.log("-----------Error in googleAuthController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error"
        });
    }
};

const userLoginController = async (req, res) => {
    try {
        console.log("--------------Inside userLoginController----------------")
        const { email, password } = req.body;
        const normalizedEmail = (email || "").trim().toLowerCase();

        const user = await userModel.findOne({ email: normalizedEmail });

        if (!user) {
            res.status(401).json({
                isSuccess: false,
                message: "Invalid email or password"
            });
            return
        }

        if (user.authProvider !== "local") {
            res.status(401).json({
                isSuccess: false,
                message: "Please sign in with Google"
            });
            return 
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({
                isSuccess: false,
                message: "Invalid email or password"
            });
            return 
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            isSuccess: true,
            message: "Login Success!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
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




module.exports = { userSignUpController, googleAuthController,userLoginController };