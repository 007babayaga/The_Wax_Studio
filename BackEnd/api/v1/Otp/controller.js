const { userModel } = require("../../../models/userSchema")
const {
    OTP_PURPOSES,
    SIGNUP_COOKIE_NAME,
    SIGNUP_VERIFIED_WINDOW_MS,
    issueOtp,
    verifyOtp,
    markSignupVerified
} = require("../../../utils/otpService")
const { baseCookieOptions } = require("../../../utils/cookieOptions")

// Turns an issueOtp() result that isn't 'sent' into a response.
// Returns true if it responded.
const respondToIssueFailure = (res, result) => {
    if (result.status === 'cooldown') {
        res.status(429).json({
            isSuccess: false,
            message: `Please wait ${result.retryAfterSeconds} seconds before requesting another OTP`,
            retryAfterSeconds: result.retryAfterSeconds
        })
        return true
    }
    if (result.status === 'limit') {
        const minutes = Math.ceil(result.retryAfterSeconds / 60)
        res.status(429).json({
            isSuccess: false,
            message: `Too many OTP requests for this email. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}`,
            retryAfterSeconds: result.retryAfterSeconds
        })
        return true
    }
    if (result.status === 'send_failed') {
        console.log("Error sending OTP email", result.error?.message)
        res.status(503).json({
            isSuccess: false,
            message: "We couldn't send the OTP email right now. Please try again"
        })
        return true
    }
    return false
}

// POST /otp/toEmail — the email is validated, normalized and checked to be
// unregistered by validateUserEmail. Also used by the frontend to resend.
const sendOtpController = async (req, res) => {
    try {
        console.log("-------Inside sendOtpController--------------")
        const { email, name, dateOfBirth } = req.body

        const result = await issueOtp({
            email,
            purpose: OTP_PURPOSES.SIGNUP,
            profile: { name, dateOfBirth }
        })
        if (respondToIssueFailure(res, result)) return

        return res.status(200).json({
            isSuccess: true,
            message: "OTP sent successfully to your email"
        })
    }
    catch (err) {
        console.log("Error in sendOtpController", err.message)
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
    }
}

// POST /otp/resendOtpToEmail — only for a sign-up already started with /toEmail.
const resendOtpController = async (req, res) => {
    try {
        console.log("-------Inside resendOtpController--------------")
        const { email } = req.body

        const existingUser = await userModel.exists({ email })
        if (existingUser) {
            return res.status(409).json({
                isSuccess: false,
                message: "Email is already registered"
            })
        }

        const result = await issueOtp({ email, purpose: OTP_PURPOSES.SIGNUP })
        if (respondToIssueFailure(res, result)) return

        return res.status(200).json({
            isSuccess: true,
            message: "OTP resent successfully to your email"
        })
    }
    catch (err) {
        console.log("Error in resendOtpController", err.message)
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
    }
}

// POST /otp/verifyEmailOtp — on success sets an httpOnly cookie that
// POST /auth/signUp requires, so only this browser can finish the sign-up.
const verifyEmailOtpController = async (req, res) => {
    try {
        console.log("-------Inside verifyEmailOtpController--------------")
        const { email, otp } = req.body

        const result = await verifyOtp({ email, otp, purpose: OTP_PURPOSES.SIGNUP })

        switch (result.status) {
            case 'not_found':
                return res.status(400).json({
                    isSuccess: false,
                    message: "No OTP found for this email. Please request a new one"
                })
            case 'expired':
                return res.status(400).json({
                    isSuccess: false,
                    message: "OTP has expired. Please request a new one"
                })
            case 'locked':
                return res.status(429).json({
                    isSuccess: false,
                    message: "Too many invalid attempts. Please request a new OTP"
                })
            case 'invalid':
                return res.status(400).json({
                    isSuccess: false,
                    message: "Invalid OTP",
                    attemptsLeft: result.attemptsLeft
                })
        }

        const token = await markSignupVerified(result.record)
        if (!token) {
            // A new code was sent while this one was being checked.
            return res.status(400).json({
                isSuccess: false,
                message: "This OTP is no longer valid. Please use the latest one"
            })
        }

        res.cookie(SIGNUP_COOKIE_NAME, token, {
            ...baseCookieOptions(),
            maxAge: SIGNUP_VERIFIED_WINDOW_MS
        })

        return res.status(200).json({
            isSuccess: true,
            message: "Email verified successfully"
        })
    }
    catch (err) {
        console.log("Error in verifyEmailOtpController", err.message)
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
    }
}

module.exports = { sendOtpController, resendOtpController, verifyEmailOtpController }
