const { userModel } = require("../../../models/userSchema")

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SIGNUP_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

// Only plain strings: an object like { "$gt": "" } would otherwise reach
// MongoDB as a query operator and match someone else's OTP record.
const readEmail = (body) =>
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

// POST /otp/toEmail — start sign-up for a new Gmail address.
const validateUserEmail = async(req,res,next)=>{
    try{
        console.log("-------------------Inside validateUserEmail----------- ")
        const email = readEmail(req.body)

        if (!email) {
            res.status(400).json({
                isSuccess: false,
                message: "Email is required"
            })
            return
        }

        if (!SIGNUP_EMAIL_REGEX.test(email)) {
            res.status(400).json({
                isSuccess: false,
                message: "Email format is invalid"
            })
            return
        }

        const existingUser = await userModel.findOne({ email })
        if (existingUser) {
            res.status(409).json({
                isSuccess: false,
                message: "Email is already registered"
            })
            return
        }

        req.body.email = email
        next();
    }
    catch(err){
        console.log("Error in validateUserEmail", err.message)
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
    }
}

// POST /otp/resendOtpToEmail
const validateResendOtp = (req, res, next) => {
    const email = readEmail(req.body)
    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            isSuccess: false,
            message: "Enter valid email address"
        })
    }
    req.body.email = email
    return next()
}

// POST /otp/verifyEmailOtp
const validateVerifyOtp = (req, res, next) => {
    const email = readEmail(req.body)
    const otp = req.body?.otp

    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            isSuccess: false,
            message: "Enter valid email address"
        })
    }
    if (typeof otp !== "string" && typeof otp !== "number") {
        return res.status(400).json({
            isSuccess: false,
            message: "Enter a valid OTP"
        })
    }
    if (!/^\d{5}$/.test(String(otp).trim())) {
        return res.status(400).json({
            isSuccess: false,
            message: "Enter a valid OTP"
        })
    }

    req.body.email = email
    req.body.otp = String(otp).trim()
    return next()
}

module.exports = { validateUserEmail, validateResendOtp, validateVerifyOtp }
