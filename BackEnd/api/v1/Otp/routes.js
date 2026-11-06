const express = require('express')
const { validateUserEmail, validateResendOtp, validateVerifyOtp } = require('./dto')
const { sendOtpController, resendOtpController, verifyEmailOtpController } = require('./controller')

const otpRouter  = express.Router()

otpRouter.post('/toEmail',validateUserEmail,sendOtpController)
otpRouter.post('/resendOtpToEmail',validateResendOtp,resendOtpController)
otpRouter.post('/verifyEmailOtp',validateVerifyOtp,verifyEmailOtpController)

module.exports={otpRouter}