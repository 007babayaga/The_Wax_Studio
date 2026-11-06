const { validateDateOfBirth } = require("../../../utils/userDOBvalidator");

// Keep in sync with FrontEnd/src/constants/passwordRules.js.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/;

// Only plain strings: an object like { "$ne": null } would otherwise reach
// MongoDB as a query operator.
const isText = (value) => typeof value === "string";

const validateUserSignUp = async (req, res, next) => {
    try {
        console.log("--------------Inside validateUserSignUp----------------");

        const { name, dateOfBirth, email, password } = req.body || {};
        const normalizedEmail = isText(email) ? email.trim().toLowerCase() : "";

        if (!name || String(name).trim().length < 3) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter a valid Name"
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            });
        }

        const dobValidation = validateDateOfBirth(dateOfBirth);
        if (!dobValidation.isValid) {
            return res.status(400).json({
                isSuccess: false,
                message: dobValidation.message
            });
        }

        if (password) {
            const passwordRegex = PASSWORD_REGEX;
            if (!passwordRegex.test(String(password))) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Enter a valid Password"
                });
            }
        }

        req.body.email = normalizedEmail;
        return next();
    } catch (err) {
        console.log("-----------Error in validateUserSignUp------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error "
        });
    }
};

const validateUserLogin = async (req, res, next) => {
    try {
        console.log("--------------Inside validateUserLogin----------------");

        const { email, password } = req.body || {};
        const normalizedEmail = isText(email) ? email.trim().toLowerCase() : "";

        if (!normalizedEmail || !isText(password) || !password) {
            return res.status(400).json({
                isSuccess: false,
                message: "Email and Password should not be Empty"
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            });
        }

        const passwordRegex = PASSWORD_REGEX;
        if (!passwordRegex.test(String(password))) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter a valid Password"
            });
        }

        req.body.email = normalizedEmail;
        return next();
    } catch (err) {
        console.log("-----------Error in validateUserLogin------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error "
        });
    }
};

const validateForgotPassword = async (req, res, next) => {
    try {
        console.log("--------------Inside validateForgotPassword----------------");

        const { email } = req.body || {};
        const normalizedEmail = isText(email) ? email.trim().toLowerCase() : "";

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            });
        }

        req.body.email = normalizedEmail;
        return next();
    } catch (err) {
        console.log("-----------Error in validateForgotPassword------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error "
        });
    }
};

const validateResetPassword = async (req, res, next) => {
    try {
        console.log("--------------Inside validateResetPassword----------------");

        const { email, otp, newPassword } = req.body || {};
        const normalizedEmail = isText(email) ? email.trim().toLowerCase() : "";

        if (!normalizedEmail || !isText(otp) || !isText(newPassword) || !otp || !newPassword) {
            return res.status(400).json({
                isSuccess: false,
                message: "Email, OTP and new password are required"
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            });
        }

        if (!/^\d{5}$/.test(String(otp))) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter a valid OTP"
            });
        }

        const passwordRegex = PASSWORD_REGEX;
        if (!passwordRegex.test(String(newPassword))) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter a valid Password"
            });
        }

        req.body.email = normalizedEmail;
        return next();
    } catch (err) {
        console.log("-----------Error in validateResetPassword------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error "
        });
    }
};

module.exports = { validateUserSignUp, validateUserLogin, validateForgotPassword, validateResetPassword };