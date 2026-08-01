const { emailOtpModel } = require("../../../models/emailOtpSchema")
const { userModel } = require("../../../models/userSchema")
const { sendOtp } = require("../../../utils/emailHelper")

const generateOtp = () => {
    return Math.floor(10000 + Math.random() * 90000).toString()
}

const sendOtpController = async(req,res)=>{
    try{
        console.log("-------Inside sendOtpController--------------")
        const { email, name, dateOfBirth } = req.body

        if (!email) {
            res.status(400).json({
                isSuccess: false,
                message: "Email is required"
            })
            return
        }

        const userDoc = await userModel.findOne({email})
        if(userDoc){
            res.status(400).json({
                isSuccess:false,
                message:"User Already Exists ! Please Login"
            })
            return
        }

        const otp = generateOtp()
        const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000)
        const lastSentAt = new Date()

        await emailOtpModel.deleteMany({ email })

        await emailOtpModel.create({
            email,
            otp,
            otpExpiryTime,
            lastSentAt,
            name: name || "",
            dateOfBirth: dateOfBirth || ""
        })

        await sendOtp(email, otp)

        res.status(200).json({
            isSuccess: true,
            message: "OTP sent successfully to your email"
        })
    }
    catch(err){
        console.log("Error in sendOtpController", err.message)
        res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
        return 
    }
}
const resendOtpController = async(req,res)=>{
    try{
        console.log("-------Inside resendOtpController--------------")
        const { email } = req.body

        if (!email) {
            res.status(400).json({
                isSuccess: false,
                message: "Email is required"
            })
            return
        }

        const otpRecord = await emailOtpModel.findOne({ email }).sort({ createdAt: -1 })
        if (!otpRecord) {
            res.status(400).json({
                isSuccess: false,
                message: "No OTP found for this email"
            })
            return
        }

        const now = new Date()
        const cooldownTime = 2 * 60 * 1000
        const lastOtpSentAt = otpRecord.lastSentAt || otpRecord.createdAt
        const timeSinceLastOtp = now - new Date(lastOtpSentAt)

        if (timeSinceLastOtp < cooldownTime) {
            const remainingSeconds = Math.ceil((cooldownTime - timeSinceLastOtp) / 1000)
            res.status(429).json({
                isSuccess: false,
                message: `Please wait ${remainingSeconds} seconds before requesting another OTP`
            })
            return
        }

        const otp = generateOtp()
        const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000)

        otpRecord.otp = otp
        otpRecord.otpExpiryTime = otpExpiryTime
        otpRecord.lastSentAt = new Date()
        otpRecord.attempts = 0
        otpRecord.isVerified = false
        otpRecord.verifiedAt = null
        await otpRecord.save()

        await sendOtp(email, otp)

        return res.status(200).json({
            isSuccess: true,
            message: "OTP Resend successfully to your email"
        })
    }
    catch(err){
        console.log("Error in resendOtpController", err.message)
        res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
        return
    }
}
const verifyEmailOtpController = async(req,res)=>{
    try{
        console.log("-------Inside verifyEmailOtpController--------------")
        const { email, otp } = req.body

        if (!email || !otp) {
            res.status(400).json({
                isSuccess: false,
                message: "Email and OTP are required"
            })
            return 
        }

        const otpDoc = await emailOtpModel.findOne({ email })

        if (!otpDoc) {
            res.status(400).json({
                isSuccess: false,
                message: "No OTP found for this email"
            })
            return 
        }

        const now = new Date()
        if (now > new Date(otpDoc.otpExpiryTime)) {
            emailOtpModel.deleteOne({ _id: otpDoc._id })
            res.status(400).json({
                isSuccess: false,
                message: "OTP has expired"
            })
            return 
        }

        const isOtpMatched = await otpDoc.compareOtp(otp)

        if (!isOtpMatched) {
            res.status(400).json({
                isSuccess: false,
                message: "Invalid OTP"
            })
            return 
        }

        

        otpDoc.isVerified = true
        otpDoc.verifiedAt = now
        otpDoc.attempts = 0
        await otpDoc.save()

        await emailOtpModel.deleteOne({ _id: otpDoc._id })

        return res.status(200).json({
            isSuccess: true,
            message: "Email verified successfully"
        })
    }
    catch(err){
        console.log("Error in verifyEmailOtpController", err.message)
        res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
        return
    }
}

module.exports = { sendOtpController, resendOtpController ,verifyEmailOtpController}